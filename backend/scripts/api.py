import os
import io
import sys
import tempfile

# Fix Windows console encoding (cp1252 -> utf-8) to prevent emoji crashes
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import re
from pydantic import BaseModel
from typing import Optional
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from groq import Groq
import edge_tts
import asyncio
import PyPDF2
from PIL import Image
import uuid

from scripts.db import (
    init_db, save_verification, get_session_history,
    save_vault_document, save_extracted_data, update_user_profile, 
    get_user_profile, get_user_documents, delete_vault_document,
    update_extraction_status, get_document_detail, get_aggregated_vault_data
)
from scripts.storage import upload_document
from scripts.eligibility_engine import check_all_schemes, generate_ai_prompt_context
from scripts.scheme_rules import SCHEME_RULES

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

# --- 1. SETUP & CONFIG ---
app = FastAPI(title="SchemeSaarthi Agentic API")

@app.on_event("startup")
def on_startup():
    init_db()

# --- CORS (allow React frontend on localhost:5173) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str
    language: str = "English"

class SpeakRequest(BaseModel):
    text: str
    language: str = "English"

# Request model matching what React frontend sends
class ChatRequest(BaseModel):
    query_text: str
    query_type: str = "general"
    context_documents: list = []

class RiskCheckRequest(BaseModel):
    scheme_name: str
    state: str
    income: str
    category: str

class EligibilityRequest(BaseModel):
    user_id: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    state: Optional[str] = None
    category: Optional[str] = None
    income: Optional[str] = None
    occupation: Optional[str] = None
    has_house: Optional[bool] = None
    land_holding: Optional[str] = None
    has_disability: Optional[bool] = False
    is_student: Optional[bool] = False
    is_bpl: Optional[bool] = False
    is_taxpayer: Optional[bool] = False
    owns_four_wheeler: Optional[bool] = False

# Structured output prompt - improved for accuracy
STRUCTURED_OUTPUT_PROMPT = """You are SchemeSaarthi, an expert AI assistant for Indian government schemes.

User's question: {question}

Verified scheme information from our knowledge base:
{context}

ACCURACY RULES:
1. ONLY use facts, numbers, and criteria from the scheme information above. Do NOT invent details.
2. Always cite specific amounts (e.g. Rs.1,500/month), age limits, income limits from context.
3. If the context lacks info, say so honestly. Do not hallucinate.
4. For eligibility questions, list EVERY criterion (age, income, gender, state, documents).
5. Always mention the official application URL if available in the context.

You MUST respond in ONLY valid JSON (no markdown, no backticks).
CRITICAL: Do NOT use literal newlines inside JSON string values. Use escaped newline characters instead.

Use this exact structure:
{{
  "confidence": <int 0-100>,
  "understanding": "<1-2 sentence summary of the question>",
  "likely_reasoning": "<detailed accurate answer using ONLY facts from context>",
  "problems_found": ["<issue or warning>"],
  "document_check": ["<required document 1>", "<required document 2>"],
  "next_steps": ["<actionable step 1>", "<actionable step 2>"],
  "risk_analysis": null
}}

If the user asks about rejection risk, include risk_analysis:
{{
  "score": <0-100>,
  "level": "<LOW | MEDIUM | HIGH>",
  "issues": ["<risk reason>"],
  "fixes": ["<how to fix>"]
}}

Rules:
- problems_found: list issues or warnings. Empty [] if none.
- document_check: list required documents from context. Empty [] if not applicable.
- next_steps: always provide at least one actionable step.
- Make likely_reasoning detailed with specific facts from context.
- Include risk_analysis ONLY for application or rejection questions. Otherwise null.
"""

# Global Variables
vectorstore = None
retriever = None
llm = None
groq_client = None

# --- 2. SPECIALIST PROMPTS (The Agents) ---

# Agent 1: Eligibility Specialist
eligibility_template = """You are the Eligibility Reasoning Agent. 
Your goal is to determine if a user qualifies for the scheme based on the rules.
1. Compare the user's details in the question to the criteria in the context.
2. If details are missing (like income or caste), explicitly ask for them.
3. Be strict. Cite the specific rule.

Context: {context}
Question: {question}
Analysis:"""

# Agent 2: Document Specialist
document_template = """You are the Document Readiness Agent.
List ONLY the official documents required based on the context.
1. Group them logically (Identity, Income, Property).
2. Mention any validity requirements (e.g., "Must be issued within 6 months").

Context: {context}
Question: {question}
Checklist:"""

# Agent 3: Rejection Diagnosis Agent (The Novel Angle)
rejection_template = """You are the Rejection Diagnosis Agent.
The user might fail to get the benefit or is asking about getting rejected. Analyze the context to find "exclusion criteria" or common rejection reasons against the user's details.
1. Identify missing criteria or direct violations of the scheme rules.
2. Provide a concrete risk analysis.
3. Suggest a fix if possible.

Context: {context}
Question: {question}
Diagnosis:"""

# Agent 4: Risk Analysis Agent (Dedicated Endpoint)
analyze_risk_template = """You are the Scheme Rejection Risk Analysis Agent.
You assess a user's eligibility for {scheme_name} based on their profile and extracted document text.

User Profile:
- State: {state}
- Income: {income}
- Category: {category}
- Age: {age}
- Gender: {gender}

Text extracted from uploaded documents:
{document_text}

Scheme Rules (from Knowledge Base):
{context}

ACCURACY RULES:
1. Base your risk assessment strictly on the Scheme Rules provided above.
2. If the user's profile violates a rule (e.g. they are male but the scheme is for females, or their income > the limit, or they are out of the age range), mark HIGH risk.
3. If documents are provided but lack necessary proof, mark MEDIUM or HIGH risk.

Your objective is to output ONLY VALID JSON with the exact following structure:
{{
  "score": <0-100 integer representing rejection probability. 0=guaranteed approval, 100=guaranteed rejection>,
  "level": "<LOW | MEDIUM | HIGH>",
  "issues": [
    "<specific rule violation with exact numbers/facts cited from context>"
  ],
  "fixes": [
    "<specific action to resolve the issue>"
  ]
}}

CRITICAL INSTRUCTIONS:
- You MUST return ONLY the raw JSON object. Do not wrap in markdown fences.
- Ensure all literal newlines inside strings are escaped (`\\n`).
"""

# Default Agent (Fallback)
general_template = """You are SchemeSaarthi. Answer the question helpfully based on the context.
Context: {context}
Question: {question}
Answer:"""

# Agent 5: Document Verification Agent (NEW)
verification_template = """You are the Document Verification Agent for Indian government schemes.
You have been given the text extracted from a document uploaded by a user, and the name of the scheme they are applying for.

Your job:
1. Identify what TYPE of document this is (Aadhaar, Income Certificate, Caste Certificate, PAN, etc.)
2. Check if this document type is typically REQUIRED for the given scheme.
3. Look for any red flags: expired dates, missing info, inconsistencies.
4. Give a clear VERDICT: VALID, INVALID, or NEEDS_REVIEW.

Scheme Context (from knowledge base):
{context}

Scheme Name: {scheme_name}

Extracted Document Text:
{document_text}

Provide your analysis in this format:
📄 Document Type: [identified type]
✅ Relevance to Scheme: [Yes/No + explanation]
🔍 Issues Found: [any problems or "None"]
📋 Verdict: [VALID / INVALID / NEEDS_REVIEW]
💡 Recommendation: [what the user should do next]"""

# --- 3. THE ORCHESTRATOR (The Router) ---
def get_router_decision(question):
    """
    Decides which agent should handle the request.
    This is a simple keyword-based router for speed (since we are running local).
    For production, we would use an LLM classifier here.
    """
    q = question.lower()
    
    if any(x in q for x in ["eligible", "am i", "can i apply", "qualify", "criteria"]):
        return "eligibility", eligibility_template
    elif any(x in q for x in ["document", "paper", "certificate", "proof", "attach"]):
        return "documents", document_template
    elif any(x in q for x in ["reject", "fail", "deny", "status", "wrong", "reason"]):
        return "rejection", rejection_template
    else:
        return "general", general_template

# --- 4. STARTUP ---
@app.on_event("startup")
async def load_system():
    global vectorstore, retriever, llm, groq_client
    print("[INFO] Booting up Agentic Architecture...")
    
    # Path Setup
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, "..", "chroma_db_data")

    # Load Memory
    embedding_function = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = Chroma(persist_directory=db_path, embedding_function=embedding_function)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 6})
    
    # Load Brain (LLM)
    print("[INFO] Configuring Groq (Llama 3.3 70B)...")
    llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY")) 
    
    # Load Groq client for Whisper (STT)
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    # Initialize Neon DB
    try:
        init_db()
    except Exception as e:
        print(f"[WARNING] Neon DB init failed: {e}")
    
    print("[INFO] Orchestrator Ready (Groq + Whisper + Neon + Supabase)!")

# --- 5. CHAT ENDPOINT ---
@app.post("/ask")
async def ask_agent(request: QueryRequest):
    print(f"[INFO] Incoming: {request.question}")
    
    # A. ORCHESTRATION STEP
    intent, selected_template = get_router_decision(request.question)
    print(f"[INFO] Router Decision: Sending to {intent.upper()} AGENT")
    
    # B. RETRIEVAL STEP
    docs = retriever.invoke(request.question)
    context_text = "\n\n".join(doc.page_content for doc in docs)
    
    # C. GENERATION STEP
    try:
        prompt = ChatPromptTemplate.from_template(selected_template)
        chain = prompt | llm | StrOutputParser()
        response_text = chain.invoke({"context": context_text, "question": request.question})
    except Exception as e:
        print(f"[ERROR] Generation Error: {e}")
        response_text = "I encountered an error generating the response. Please try again."
    
    return {
        "answer": response_text,
        "agent_used": intent,
        "source_docs": len(docs)
    }

# --- 5.5 REACT FRONTEND CHAT ENDPOINT ---
@app.post("/api/v1/chat/")
@app.post("/api/v1/chat")
async def react_chat(request: ChatRequest):
    """Endpoint for the React frontend. Returns structured JSON."""
    print(f"[INFO] 🌐 React Chat: '{request.query_text}' (type: {request.query_type})")
    
    # A. ROUTE based on query_type from frontend
    type_to_template = {
        "eligibility": eligibility_template,
        "documents": document_template,
        "rejection": rejection_template,
        "general": general_template,
    }
    
    # Use frontend's query_type if it maps to a known agent, else auto-detect
    if request.query_type in type_to_template and request.query_type != "general":
        intent = request.query_type
        selected_template_unused = type_to_template[request.query_type]
    else:
        intent, selected_template_unused = get_router_decision(request.query_text)
    
    print(f"[INFO] 🛡️ Router → {intent.upper()} AGENT")
    
    # B. RETRIEVE from ChromaDB
    docs = retriever.invoke(request.query_text)
    context_text = "\n\n".join(doc.page_content for doc in docs)
    
    # C. GENERATE structured response using the structured prompt
    raw_response = ""
    try:
        prompt = ChatPromptTemplate.from_template(STRUCTURED_OUTPUT_PROMPT)
        chain = prompt | llm | StrOutputParser()
        raw_response = chain.invoke({"context": context_text, "question": request.query_text})
        
        print(f"[DEBUG] Raw LLM response (first 300 chars): {raw_response[:300]}")
        
        # --- Robust JSON extraction ---
        cleaned = raw_response.strip()
        
        # Strip markdown code fences if present
        if "```" in cleaned:
            # Extract content between ```json and ``` (or just ``` and ```)
            fence_match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', cleaned)
            if fence_match:
                cleaned = fence_match.group(1).strip()
        
        # Try 1: Direct parse
        parsed = None
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            # Try 2: Find the outermost { ... } with balanced braces
            brace_depth = 0
            start_idx = None
            end_idx = None
            for i, ch in enumerate(cleaned):
                if ch == '{':
                    if brace_depth == 0:
                        start_idx = i
                    brace_depth += 1
                elif ch == '}':
                    brace_depth -= 1
                    if brace_depth == 0 and start_idx is not None:
                        end_idx = i + 1
                        break
            
            if start_idx is not None and end_idx is not None:
                json_str = cleaned[start_idx:end_idx]
                parsed = json.loads(json_str)
        
        if parsed and isinstance(parsed, dict):
            # Successfully parsed — ensure all required keys with defaults
            result = {
                "confidence": int(parsed.get("confidence", 75)),
                "understanding": str(parsed.get("understanding", "")),
                "likely_reasoning": str(parsed.get("likely_reasoning", "")),
                "problems_found": list(parsed.get("problems_found", [])),
                "document_check": list(parsed.get("document_check", [])),
                "next_steps": list(parsed.get("next_steps", [])),
            }
            print(f"[INFO] ✅ Structured response parsed (confidence: {result['confidence']}%)")
            return result
        else:
            raise ValueError("Parsed result is not a dict")
        
    except (json.JSONDecodeError, ValueError) as e:
        print(f"[WARNING] JSON parse failed ({e}), building structured fallback from raw text")
        # Build a clean structured response from raw text (NOT raw JSON dump)
        clean_text = raw_response
        # If the raw response looks like JSON, try to extract just the reasoning
        if clean_text.strip().startswith("{"):
            try:
                quick_parse = json.loads(re.search(r'\{[\s\S]*\}', clean_text).group())
                return {
                    "confidence": quick_parse.get("confidence", 75),
                    "understanding": quick_parse.get("understanding", f"You asked about: {request.query_text[:80]}"),
                    "likely_reasoning": quick_parse.get("likely_reasoning", clean_text),
                    "problems_found": quick_parse.get("problems_found", []),
                    "document_check": quick_parse.get("document_check", []),
                    "next_steps": quick_parse.get("next_steps", []),
                }
            except Exception:
                pass

        return {
            "confidence": 70,
            "understanding": f"You asked about: {request.query_text[:80]}",
            "likely_reasoning": clean_text,
            "problems_found": [],
            "document_check": [],
            "next_steps": ["Ask a more specific question for detailed guidance."],
        }
    except Exception as e:
        print(f"[ERROR] React chat error: {e}")
        return {
            "confidence": 0,
            "understanding": f"You asked: {request.query_text[:80]}",
            "likely_reasoning": "I'm sorry, I encountered an error processing your request. Please try again.",
            "problems_found": [str(e)],
            "document_check": [],
            "next_steps": ["Please try again in a moment."],
        }

# --- 6. AUDIO: SPEECH-TO-TEXT (Groq Whisper) ---
@app.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("auto")
):
    """Transcribe audio to text using Groq Whisper.
    Language can be 'en', 'hi', or 'auto' (for Hinglish / mixed-language auto-detection).
    """
    print(f"[INFO] 🎤 Layer 3 — STT: Transcribing audio (language hint: {language})")
    
    try:
        audio_bytes = await audio.read()
        
        if len(audio_bytes) < 100:
            raise HTTPException(status_code=400, detail="Audio too short. Please speak for at least 1 second.")
        
        # Save to a temp file (Groq SDK needs a file-like object with a name)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        
        # Build Whisper request — omit language param for auto-detect (best for Hinglish)
        whisper_kwargs = {
            "file": ("audio.wav", open(tmp_path, "rb")),
            "model": "whisper-large-v3-turbo",
            "response_format": "verbose_json",  # Returns detected language too
        }
        if language != "auto":
            whisper_kwargs["language"] = language
        
        transcription = groq_client.audio.transcriptions.create(**whisper_kwargs)
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        # Extract text and detected language from verbose response
        if hasattr(transcription, 'text'):
            text = transcription.text
            detected_lang = getattr(transcription, 'language', language)
        else:
            text = str(transcription)
            detected_lang = language
        
        print(f"[INFO] 🎤 Transcription: '{text}' (detected: {detected_lang})")
        return {
            "text": text.strip(),
            "language": language,
            "detected_language": detected_lang
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

# --- Voice options ---
VOICE_MAP = {
    "en": "en-IN-NeerjaNeural",   # Indian English female (natural)
    "hi": "hi-IN-SwaraNeural",     # Hindi female (natural)
}

async def generate_tts_audio(text: str, lang_code: str) -> bytes:
    """Generate speech audio using edge-tts. Returns MP3 bytes."""
    voice = VOICE_MAP.get(lang_code, VOICE_MAP["en"])
    communicate = edge_tts.Communicate(text, voice)
    audio_buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_buffer.write(chunk["data"])
    audio_buffer.seek(0)
    return audio_buffer.read()

# --- 7. AUDIO: TEXT-TO-SPEECH (Edge-TTS) ---
@app.post("/speak")
async def text_to_speech(request: SpeakRequest):
    """Convert text to speech using Edge-TTS (Microsoft Neural Voices)."""
    print(f"[INFO] 🔊 Layer 8 — TTS: Generating speech (language: {request.language})")
    
    try:
        lang_code = "hi" if request.language.lower() in ["hindi", "hi"] else "en"
        audio_bytes = await generate_tts_audio(request.text, lang_code)
        
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=response.mp3"}
        )
        
    except Exception as e:
        print(f"[ERROR] TTS failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")

# --- 7.5. UNIFIED VOICE CHAT (Full Pipeline in One Call) ---
@app.post("/voice-chat")
async def voice_chat(
    audio: UploadFile = File(...),
    language: str = Form("auto"),
    tts_language: str = Form("English")
):
    """
    Full voice pipeline:
    Audio → Whisper STT → RAG Agent → Edge-TTS
    Returns text + audio together (edge-tts is fast enough).
    """
    import base64
    
    print("[INFO] ═══════════════════════════════════════")
    print("[INFO] 🎤 VOICE CHAT PIPELINE STARTED")
    print("[INFO] ═══════════════════════════════════════")
    
    try:
        # ── LAYER 3: Speech-to-Text ──
        print("[INFO] 🎤 Layer 3 — Transcribing speech...")
        audio_bytes = await audio.read()
        
        if len(audio_bytes) < 100:
            raise HTTPException(status_code=400, detail="Audio too short.")
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        
        whisper_kwargs = {
            "file": ("audio.wav", open(tmp_path, "rb")),
            "model": "whisper-large-v3-turbo",
            "response_format": "verbose_json",
        }
        if language != "auto":
            whisper_kwargs["language"] = language
        
        transcription = groq_client.audio.transcriptions.create(**whisper_kwargs)
        os.unlink(tmp_path)
        
        transcribed_text = transcription.text.strip() if hasattr(transcription, 'text') else str(transcription).strip()
        detected_lang = getattr(transcription, 'language', language)
        
        if not transcribed_text:
            return {
                "transcription": "",
                "answer": "I couldn't understand the audio. Please try speaking again, louder and clearer.",
                "agent_used": "system",
                "detected_language": detected_lang,
                "audio_base64": None
            }
        
        print(f"[INFO] 📝 Transcribed: '{transcribed_text}' (lang: {detected_lang})")
        
        # ── LAYER 5+6+7: RAG Pipeline (Orchestrator → ChromaDB → LLM) ──
        print("[INFO] 🧠 Layer 5-7 — RAG Pipeline processing...")
        intent, selected_template = get_router_decision(transcribed_text)
        print(f"[INFO] 🛡️ Router → {intent.upper()} AGENT")
        
        docs = retriever.invoke(transcribed_text)
        context_text = "\n\n".join(doc.page_content for doc in docs)
        
        try:
            prompt = ChatPromptTemplate.from_template(selected_template)
            chain = prompt | llm | StrOutputParser()
            answer_text = chain.invoke({"context": context_text, "question": transcribed_text})
        except Exception as e:
            print(f"[ERROR] LLM Error: {e}")
            answer_text = "I encountered an error. Please try again."
        
        print(f"[INFO] 💬 Answer generated ({len(answer_text)} chars)")
        
        # ── LAYER 8: Text-to-Speech (Edge-TTS — only speak a short summary for speed) ──
        print("[INFO] 🔊 Layer 8 — Generating speech response (Edge-TTS)...")
        audio_base64 = None
        try:
            tts_lang = "hi" if tts_language.lower() in ["hindi", "hi"] else "en"
            
            # Only speak the first 2-3 sentences for near-instant audio
            # Full text is still returned in "answer" for display
            sentences = answer_text.replace("**", "").replace("*", "").split(".")
            spoken_text = ".".join(sentences[:3]).strip() + "."
            if len(spoken_text) < 10:
                spoken_text = answer_text[:300]
            
            audio_bytes_tts = await generate_tts_audio(spoken_text, tts_lang)
            audio_base64 = base64.b64encode(audio_bytes_tts).decode("utf-8")
            print(f"[INFO] 🔊 TTS done — spoke {len(spoken_text)} chars (full answer: {len(answer_text)} chars)")
        except Exception as e:
            print(f"[WARNING] TTS failed: {e}")
        
        print("[INFO] ═══════════════════════════════════════")
        print("[INFO] ✅ VOICE CHAT PIPELINE COMPLETE")
        print("[INFO] ═══════════════════════════════════════")
        
        return {
            "transcription": transcribed_text,
            "answer": answer_text,
            "agent_used": intent,
            "source_docs": len(docs),
            "detected_language": detected_lang,
            "audio_base64": audio_base64
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Voice chat pipeline failed: {e}")
        raise HTTPException(status_code=500, detail=f"Voice chat failed: {str(e)}")

# --- 8. DOCUMENT VERIFICATION ---
@app.post("/verify-document")
async def verify_document(
    file: UploadFile = File(...),
    scheme_name: str = Form("General"),
    session_id: str = Form("default")
):
    """Upload, extract text, verify document against scheme, and store results."""
    print(f"[INFO] Verifying document '{file.filename}' for scheme '{scheme_name}'")
    
    try:
        file_bytes = await file.read()
        file_type = file.filename.split(".")[-1].lower() if "." in file.filename else "unknown"
        
        # --- A. EXTRACT TEXT ---
        extracted_text = ""
        
        if file_type == "pdf":
            # Extract text from PDF
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_text += page_text + "\n"
        elif file_type in ["jpg", "jpeg", "png", "bmp"]:
            # For images, note that text extraction is limited without OCR
            extracted_text = "[Image uploaded — visual document. OCR text extraction is limited. Please verify manually or upload PDF version.]"
        else:
            extracted_text = f"[Unsupported file type: {file_type}]"
        
        if not extracted_text.strip():
            extracted_text = "[No readable text could be extracted from this document.]"
        
        # --- B. UPLOAD TO SUPABASE STORAGE ---
        file_url = ""
        try:
            file_url = upload_document(file_bytes, file.filename, file.content_type or "application/octet-stream")
            print(f"[INFO] File uploaded to Supabase: {file_url}")
        except Exception as e:
            print(f"[WARNING] Supabase upload failed: {e}")
            file_url = "upload_failed"
        
        # --- C. LLM VERIFICATION ---
        # Get scheme context from vector store
        docs = retriever.invoke(scheme_name)
        context_text = "\n\n".join(doc.page_content for doc in docs)
        
        # Run verification through the LLM
        prompt = ChatPromptTemplate.from_template(verification_template)
        chain = prompt | llm | StrOutputParser()
        
        verification_result = chain.invoke({
            "context": context_text,
            "scheme_name": scheme_name,
            "document_text": extracted_text[:3000]  # Limit to avoid token overflow
        })
        
        # Determine validity from the verdict
        is_valid = "VALID" in verification_result and "INVALID" not in verification_result
        
        # --- D. SAVE TO NEON DB ---
        record_id = None
        try:
            record_id = save_verification(
                session_id=session_id,
                filename=file.filename,
                file_type=file_type,
                scheme_name=scheme_name,
                file_url=file_url,
                extracted_text=extracted_text[:5000],  # Limit storage
                verification_result=verification_result,
                is_valid=is_valid
            )
            print(f"[INFO] Verification saved to Neon DB (ID: {record_id})")
        except Exception as e:
            print(f"[WARNING] Neon DB save failed: {e}")
        
        return {
            "filename": file.filename,
            "scheme_name": scheme_name,
            "verification_result": verification_result,
            "is_valid": is_valid,
            "file_url": file_url,
            "record_id": record_id
        }
        
    except Exception as e:
        print(f"[ERROR] Document verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

# --- 8.5 REJECTION RISK CHECK ---
@app.post("/api/v1/analyze-risk")
async def analyze_risk(
    scheme_name: str = Form(...),
    state: str = Form(...),
    income: str = Form(...),
    category: str = Form(...),
    age: str = Form(default="Not specified"),
    gender: str = Form(default="Not specified"),
    documents: list[UploadFile] = File(default=[])
):
    """Proactively analyze rejection risk based on user profile and documents."""
    print(f"[INFO] 🧠 Analyzing Risk for {scheme_name} (State: {state}, Income: {income}, Category: {category}, Age: {age}, Gender: {gender})")
    
    extracted_text = ""
    try:
        if documents:
            for file in documents:
                # Basic text extraction from PDF
                if file.filename.lower().endswith(".pdf"):
                    file_bytes = await file.read()
                    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                    for page in pdf_reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            extracted_text += page_text + "\n"
                elif file.filename:
                    extracted_text += f"[Image/Other format uploaded: {file.filename}]\n"
        
        # Retrieve context from ChromaDB
        query = f"{scheme_name} eligibility criteria income limit {category} state {state} age {age} gender {gender}"
        docs = retriever.invoke(query)
        context_text = "\n\n".join(doc.page_content for doc in docs)
        
        # Generate structured response
        prompt = ChatPromptTemplate.from_template(analyze_risk_template)
        chain = prompt | llm | StrOutputParser()
        
        raw_response = chain.invoke({
            "context": context_text,
            "scheme_name": scheme_name,
            "state": state,
            "income": income,
            "category": category,
            "age": age,
            "gender": gender,
            "document_text": extracted_text[:3000] if extracted_text else "No documents uploaded."
        })
        print(f"[DEBUG] Risk Agent Output: {raw_response[:300]}")
        
        # Parse JSON
        cleaned = raw_response.strip()
        if "```" in cleaned:
            fence_match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', cleaned)
            if fence_match:
                cleaned = fence_match.group(1).strip()
                
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            # Fallback for LLM JSON failures
            parsed = {
                "score": 50,
                "level": "MEDIUM",
                "issues": ["Could not parse exact risk score from AI output."],
                "fixes": ["Please review scheme guidelines manually."],
                "raw_AI_output": cleaned
            }
            
        return parsed
        
    except Exception as e:
        print(f"[ERROR] Risk analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {str(e)}")

# --- 9. DOCUMENT VAULT & AUTO-FILL ---

extract_prompt_template = """You are an expert OCR Document Parser for Indian government documents.
Analyze the provided document text and extract ALL identifiable information from it.

DOCUMENT TEXT:
{document_text}

Extract every piece of information you can identify. Use descriptive human-readable keys.
Examples of fields you might find: name, father_name, date_of_birth, aadhaar_number, pan_number,
address, income, caste, category, gender, phone, district, state, certificate_number, issuing_authority,
date_of_issue, validity, etc.

Rules:
- Only include fields that are actually present in the document
- Use snake_case keys with clear names
- Do NOT include empty/blank fields
- Return ONLY valid JSON, starting with {{ and ending with }}. No reasoning, no markdown."""

extract_vision_prompt = """You are an expert OCR Document Parser for Indian government documents.
Look at this document image and extract ALL identifiable information from it.

Extract every piece of information you can identify. Use descriptive human-readable keys.
Examples of fields you might find: name, father_name, date_of_birth, aadhaar_number, pan_number,
address, income, caste, category, gender, phone, district, state, certificate_number, issuing_authority,
date_of_issue, validity, etc.

Rules:
- Only include fields that are actually present in the document
- Use snake_case keys with clear names
- Do NOT include empty/blank fields
- Return ONLY valid JSON, starting with { and ending with }. No reasoning, no markdown."""

def _call_groq_text_extraction(document_text):
    """Use Llama 3.3 70B for text-based extraction (reliable, fast)."""
    import requests as req
    groq_key = os.getenv("GROQ_API_KEY")
    prompt = extract_prompt_template.format(document_text=document_text)
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0
    }
    r = req.post(
        "https://api.groq.com/openai/v1/chat/completions",
        json=payload,
        headers={"Authorization": f"Bearer {groq_key}"},
        timeout=30
    )
    if r.status_code != 200:
        print(f"[VAULT ERROR] Groq text API returned {r.status_code}: {r.text}")
        return None
    return r.json()["choices"][0]["message"]["content"]

def _call_groq_vision_extraction(b64_data, mime_type):
    """Use Llama 4 Scout for image-based extraction via 'document' type."""
    import requests as req
    groq_key = os.getenv("GROQ_API_KEY")
    payload = {
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": extract_vision_prompt},
                {"type": "document", "document": {"data": b64_data, "mime_type": mime_type}}
            ]
        }],
        "temperature": 0
    }
    r = req.post(
        "https://api.groq.com/openai/v1/chat/completions",
        json=payload,
        headers={"Authorization": f"Bearer {groq_key}"},
        timeout=30
    )
    if r.status_code != 200:
        print(f"[VAULT ERROR] Groq vision API returned {r.status_code}: {r.text}")
        return None
    return r.json()["choices"][0]["message"]["content"]

def _parse_llm_json(raw_output):
    """Parse LLM output into a dict, handling markdown fences."""
    if not raw_output:
        return {}
    cleaned = raw_output.strip()
    if "```" in cleaned:
        fence_match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', cleaned)
        if fence_match:
            cleaned = fence_match.group(1).strip()
    try:
        result = json.loads(cleaned)
        # Filter out empty values
        return {k: v for k, v in result.items() if v and str(v).strip()}
    except json.JSONDecodeError:
        print(f"[VAULT WARNING] LLM JSON failure: {cleaned[:200]}")
        return {}

def _background_extract(file_bytes, filename, doc_id, user_id):
    """Background task: extract data from a document and save to DB."""
    import base64
    print(f"[VAULT BG] Starting extraction for {filename} (doc {doc_id})")
    try:
        raw_output = None
        raw_text_preview = ""

        if filename.lower().endswith(".pdf"):
            print("[VAULT BG] PDF — attempting text extraction with PyMuPDF...")
            try:
                import fitz
                pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
                all_text = ""
                for page_num in range(min(len(pdf_doc), 5)):
                    all_text += pdf_doc.load_page(page_num).get_text() + "\n"
                pdf_doc.close()
                all_text = all_text.strip()
                raw_text_preview = all_text[:300]

                if len(all_text) > 30:
                    print(f"[VAULT BG] Got {len(all_text)} chars. Using Llama 3.3...")
                    raw_output = _call_groq_text_extraction(all_text[:3000])
                else:
                    print("[VAULT BG] No text (scanned). Rendering as image...")
                    pdf_doc2 = fitz.open(stream=file_bytes, filetype="pdf")
                    page = pdf_doc2.load_page(0)
                    pix = page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes("jpeg")
                    pdf_doc2.close()
                    b64_img = base64.b64encode(img_bytes).decode("utf-8")
                    raw_output = _call_groq_vision_extraction(b64_img, "image/jpeg")
                    raw_text_preview = "[Scanned PDF -> Vision]"
            except ImportError:
                print("[VAULT BG] PyMuPDF not installed — text-only fallback")
                raw_output = _call_groq_text_extraction("(PDF uploaded but PyMuPDF not available)")
                raw_text_preview = "[PyMuPDF not available]"
        else:
            ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "jpg"
            mime_map = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}
            mime_type = mime_map.get(ext, "image/jpeg")
            print(f"[VAULT BG] Image ({mime_type}). Using Llama 4 Scout Vision...")
            b64_data = base64.b64encode(file_bytes).decode("utf-8")
            raw_output = _call_groq_vision_extraction(b64_data, mime_type)
            raw_text_preview = f"[Image Vision: {filename}]"

        parsed_data = _parse_llm_json(raw_output)
        ext_id = str(uuid.uuid4())
        save_extracted_data(ext_id, user_id, doc_id, parsed_data, raw_text_preview)
        update_extraction_status(doc_id, "completed")
        print(f"[VAULT BG] ✅ Extraction complete for {filename}")
    except Exception as e:
        print(f"[VAULT BG ERROR] Extraction failed for {filename}: {e}")
        import traceback
        traceback.print_exc()
        update_extraction_status(doc_id, "failed")

@app.post("/api/v1/vault/upload-document")
async def vault_upload_document(
    background_tasks: BackgroundTasks,
    user_id: str = Form(...),
    doc_type: str = Form(...),
    file: UploadFile = File(...)
):
    print(f"[VAULT] Uploading {doc_type} for user {user_id}")
    try:
        from scripts.db import get_connection
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM documents WHERE user_id = %s AND filename = %s", (user_id, file.filename))
        existing = cur.fetchone()
        cur.close()
        conn.close()
        if existing:
            return {"status": "error", "message": f"{file.filename} is already uploaded in your Vault."}

        file_bytes = await file.read()
        
        # Explicitly set correct MIME type for PDFs to prevent browser download boxes
        mime_type = file.content_type
        if file.filename.lower().endswith(".pdf"):
            mime_type = "application/pdf"
        elif not mime_type:
            mime_type = "application/octet-stream"
            
        file_url = upload_document(file_bytes, file.filename, mime_type)
        doc_id = str(uuid.uuid4())
        save_vault_document(doc_id, user_id, file_url, doc_type, file.filename)

        # Trigger extraction in background — upload returns instantly
        background_tasks.add_task(_background_extract, file_bytes, file.filename, doc_id, user_id)

        return {"status": "success", "doc_id": doc_id, "file_url": file_url}
    except Exception as e:
        print(f"[VAULT ERROR] Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/vault/document/{doc_id}")
async def vault_get_document(doc_id: str, user_id: str = Query(...)):
    """Get a single document with its extracted data for the detail view."""
    doc = get_document_detail(doc_id, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.delete("/api/v1/vault/documents/{doc_id}")
async def vault_delete_document(doc_id: str, user_id: str = Query(...)):
    print(f"[VAULT] Deleting doc {doc_id} for user {user_id}")
    try:
        success = delete_vault_document(doc_id, user_id)
        if success:
            return {"status": "success", "message": "Document deleted"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        print(f"[VAULT ERROR] Deletion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ProfileUpdate(BaseModel):
    user_id: str
    data: dict

@app.post("/api/v1/vault/update-profile")
async def vault_update_profile(request: ProfileUpdate):
    print(f"[VAULT] Updating profile for {request.user_id}")
    try:
        update_user_profile(request.user_id, request.data)
        return {"status": "success", "message": "Profile updated successfully"}
    except Exception as e:
        print(f"[VAULT ERROR] Profile update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/vault/profile/{user_id}")
async def get_vault_profile(user_id: str):
    profile = get_user_profile(user_id)
    docs = get_user_documents(user_id)
    return {"profile": profile, "documents": docs}

@app.get("/api/v1/vault/autofill/{scheme_name}")
async def vault_autofill(scheme_name: str, user_id: str):
    print(f"[VAULT] Autofill requested for {scheme_name} by {user_id}")
    from scripts.db import get_aggregated_vault_data
    profile = get_aggregated_vault_data(user_id)
    if not profile:
        return {"status": "error", "message": "No profile found"}
        
    # Basic mapping: What do we have vs what might be needed
    # (In a real system, we'd cross-reference with ChromaDB schema requirements)
    needed_fields = ["name", "dob", "address", "income", "aadhaar_number"]
    filled_fields = {k: v for k, v in profile.items() if v}
    missing_fields = [f for f in needed_fields if f not in profile]
    
    return {
        "status": "success",
        "scheme": scheme_name,
        "filled": filled_fields,
        "missing": missing_fields
    }

# --- 10. VERIFICATION HISTORY ---
@app.get("/verification-history/{session_id}")
async def get_history(session_id: str):
    """Get document verification history for a session."""
    try:
        rows = get_session_history(session_id)
        history = []
        for row in rows:
            history.append({
                "id": row[0],
                "filename": row[1],
                "scheme_name": row[2],
                "verification_result": row[3],
                "is_valid": row[4],
                "uploaded_at": str(row[5]),
                "file_url": row[6]
            })
        return {"history": history}
    except Exception as e:
        print(f"[ERROR] History fetch failed: {e}")
        return {"history": [], "error": str(e)}

# ─────────────────────────────────────────────────────────────────────────────
# --- 11. ELIGIBILITY ENGINE ENDPOINTS ---
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/v1/eligibility/check")
async def check_eligibility_endpoint(request: EligibilityRequest):
    """
    Dual-layer eligibility check:
    1. Deterministic rules engine (instant, 100% accurate for known schemes)
    2. AI narrative layer (Groq - explains top results in plain language)
    If user_id is provided, auto-merges vault profile data into user_data.
    """
    print(f"[INFO] ✅ Eligibility check requested (user_id: {request.user_id})")

    # Build user_data dict from request
    user_data = {
        "age": request.age,
        "gender": request.gender,
        "state": request.state,
        "category": request.category,
        "income": request.income,
        "occupation": request.occupation,
        "has_house": request.has_house,
        "land_holding": request.land_holding,
        "has_disability": request.has_disability,
        "is_student": request.is_student,
        "is_bpl": request.is_bpl,
        "is_taxpayer": request.is_taxpayer,
        "owns_four_wheeler": request.owns_four_wheeler,
    }

    # Auto-merge vault data if user_id provided
    if request.user_id:
        try:
            vault_data = get_aggregated_vault_data(request.user_id)
            profile_data = get_user_profile(request.user_id) or {}

            # Map vault keys → eligibility fields (don't override user-provided values)
            vault_income = vault_data.get("income") or profile_data.get("income")
            vault_name = vault_data.get("name") or profile_data.get("name")

            if not user_data["income"] and vault_income:
                user_data["income"] = str(vault_income)
                print(f"[INFO] Auto-filled income from vault: {vault_income}")
            if vault_name:
                user_data["name"] = vault_name
        except Exception as e:
            print(f"[WARNING] Could not merge vault data: {e}")

    # Step 1: Deterministic Rules Engine
    engine_results = check_all_schemes(user_data)
    print(f"[INFO] Rules engine: {engine_results['eligible_count']} eligible, "
          f"{engine_results['ineligible_count']} ineligible out of {engine_results['total_schemes_checked']}")

    # Step 2: AI Narrative Layer (Groq) for top 3 eligible schemes
    ai_narrative = ""
    top_eligible = engine_results["eligible_schemes"][:3]

    if llm and top_eligible:
        try:
            context_str = generate_ai_prompt_context(user_data, top_eligible)
            if retriever:
                docs = retriever.invoke("eligibility schemes India government benefit")
                kb_context = "\n".join(doc.page_content for doc in docs[:3])
            else:
                kb_context = ""

            ai_prompt = ChatPromptTemplate.from_template("""
You are SchemeSaarthi's Eligibility Advisor. Based on the user's profile and their top matching schemes,
write a short (3-5 sentence), warm, encouraging, and personalised summary in plain English.
Mention the most impactful benefit they can receive. List ONE thing they should do next.
Do NOT use markdown headers. Write in a conversational tone.

{context}

Knowledge Base Context:
{kb_context}

Your personalised eligibility summary:
""")
            chain = ai_prompt | llm | StrOutputParser()
            ai_narrative = chain.invoke({"context": context_str, "kb_context": kb_context})
            print(f"[INFO] AI narrative generated ({len(ai_narrative)} chars)")
        except Exception as e:
            print(f"[WARNING] AI narrative failed: {e}")
            ai_narrative = f"Based on your profile, {engine_results['eligible_count']} schemes match your eligibility."
    else:
        count = engine_results['eligible_count']
        if count > 0:
            ai_narrative = (
                f"Great news! Based on the information you provided, you match {count} government scheme(s). "
                f"Your top match is {top_eligible[0]['scheme_name']} — {top_eligible[0]['benefit']}. "
                "Review the detailed results below and click 'Apply' to get started."
            )
        else:
            ai_narrative = (
                "Based on the information provided, we could not find schemes that match all your criteria. "
                "Try adjusting your profile details or filling in missing information for more accurate results."
            )

    return {
        "user_data": user_data,
        "summary": {
            "total_checked": engine_results["total_schemes_checked"],
            "eligible_count": engine_results["eligible_count"],
            "partial_count": engine_results["partial_count"],
            "ineligible_count": engine_results["ineligible_count"],
        },
        "ai_narrative": ai_narrative,
        "eligible_schemes": engine_results["eligible_schemes"],
        "partial_schemes": engine_results["partial_schemes"],
        "ineligible_schemes": engine_results["ineligible_schemes"],
    }


@app.get("/api/v1/eligibility/vault-prefill/{user_id}")
async def get_vault_prefill(user_id: str):
    """
    Return extracted vault data for auto-filling the eligibility form.
    """
    try:
        vault_data = get_aggregated_vault_data(user_id)
        profile_data = get_user_profile(user_id) or {}

        prefill = {
            "name": vault_data.get("name") or profile_data.get("name"),
            "income": vault_data.get("income") or profile_data.get("income"),
            "dob": vault_data.get("dob") or profile_data.get("dob"),
            "address": vault_data.get("address") or profile_data.get("address"),
            "aadhaar_number": vault_data.get("aadhaar_number") or profile_data.get("aadhaar_number"),
            # Any other fields extracted by the AI from documents
            "gender": vault_data.get("gender"),
            "category": vault_data.get("category") or vault_data.get("caste_category"),
            "state": vault_data.get("state") or vault_data.get("permanent_state"),
            "occupation": vault_data.get("occupation") or vault_data.get("profession"),
        }
        # Filter out None values
        prefill = {k: v for k, v in prefill.items() if v is not None}
        return {"prefill": prefill, "fields_found": list(prefill.keys())}
    except Exception as e:
        print(f"[ERROR] Vault prefill error: {e}")
        return {"prefill": {}, "fields_found": [], "error": str(e)}


@app.get("/api/v1/eligibility/schemes")
async def list_all_schemes():
    """Return metadata for all schemes (for informational display)."""
    schemes = []
    for key, scheme in SCHEME_RULES.items():
        schemes.append({
            "key": key,
            "name": scheme["name"],
            "ministry": scheme["ministry"],
            "description": scheme["description"],
            "benefit": scheme["benefit"],
            "tags": scheme["tags"],
            "apply_url": scheme["apply_url"],
        })
    return {"schemes": schemes, "total": len(schemes)}


@app.get("/")
def home():
    return {"status": "Agent Orchestrator Online 🟢 (Audio + Documents + DB + Eligibility Engine)"}