import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# --- 1. SETUP & CONFIG ---
app = FastAPI(title="SchemeSaarthi Agentic API")

class QueryRequest(BaseModel):
    question: str
    language: str = "English"

# Global Variables
vectorstore = None
retriever = None
llm = None
llm = None

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
The user failed to get the benefit. Analyze the context to find "exclusion criteria" or common rejection reasons.
1. Explain WHY applications usually fail.
2. Suggest a fix if possible.
3. Use empathetic but professional language.

Context: {context}
Question: {question}
Diagnosis:"""

# Default Agent (Fallback)
general_template = """You are SchemeSaarthi. Answer the question helpfully based on the context.
Context: {context}
Question: {question}
Answer:"""

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
    global vectorstore, retriever, llm
    print("[INFO] Booting up Agentic Architecture...")
    
    # Path Setup
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, "..", "chroma_db_data")

    # Load Memory
    embedding_function = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = Chroma(persist_directory=db_path, embedding_function=embedding_function)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4}) # Increase context for better reasoning
    
    # Load Brain
    # Load Brain
    # Using Ollama (Llama 3.2)
    print("[INFO] Configuring Ollama (Llama 3.2:1b)...")
    llm = ChatOllama(model="llama3.2") 
    # OR use "llama3.2:1b" if that is what you downloaded
    print("[INFO] Orchestrator Ready (Ollama Powered)!")

# --- 5. THE ENDPOINT ---
@app.post("/ask")
async def ask_agent(request: QueryRequest):
    print(f"[INFO] Incoming: {request.question}")
    
    # A. ORCHESTRATION STEP
    intent, selected_template = get_router_decision(request.question)
    print(f"[INFO] Router Decision: Sending to {intent.upper()} AGENT")
    
    # B. RETRIEVAL STEP
    docs = retriever.invoke(request.question)
    context_text = "\n\n".join(doc.page_content for doc in docs)
    
    # C. GENERATION STEP (Using the selected agent's prompt)
    # C. GENERATION STEP (Using the selected agent's prompt)
    try:
        prompt = ChatPromptTemplate.from_template(selected_template)
        chain = prompt | llm | StrOutputParser()
        
        response_text = chain.invoke({"context": context_text, "question": request.question})
    except Exception as e:
        print(f"[ERROR] Generation Error: {e}")
        response_text = "I encountered an error generating the response. Please try again."
    
    return {
        "answer": response_text,
        "agent_used": intent, # Sending this back so UI can show which agent worked!
        "source_docs": len(docs)
    }

@app.get("/")
def home():
    return {"status": "Agent Orchestrator Online 🟢"}