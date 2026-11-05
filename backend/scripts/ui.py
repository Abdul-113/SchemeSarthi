import streamlit as st
import requests
import uuid
import base64

# --- CONFIG ---
API_URL = "http://127.0.0.1:8000"
PAGE_TITLE = "SchemeSaarthi AI 🇮🇳"
PAGE_ICON = "🚜"

# --- PAGE SETUP ---
st.set_page_config(page_title=PAGE_TITLE, page_icon=PAGE_ICON, layout="wide")

# --- SESSION STATE ---
if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())[:8]
if "messages" not in st.session_state:
    st.session_state.messages = []
if "last_audio_response" not in st.session_state:
    st.session_state.last_audio_response = None
if "voice_processing" not in st.session_state:
    st.session_state.voice_processing = False

# --- HEADER ---
st.title(f"{PAGE_ICON} {PAGE_TITLE}")
st.markdown("### Your Personal Assistant for Government Schemes")

# --- SIDEBAR ---
with st.sidebar:
    st.header("⚙️ Settings")
    language = st.selectbox("🌐 Select Language", ["English", "Hindi"])
    lang_code = "hi" if language == "Hindi" else "en"
    
    st.divider()
    
    st.header("🎤 Voice Settings")
    input_mode = st.radio("Input Mode:", ["💬 Type", "🎙️ Voice"], horizontal=True)
    
    enable_voice_response = st.toggle(
        "🔊 Auto Voice Response", 
        value=True, 
        help="Automatically hear the agent's answer as audio"
    )
    
    hinglish_mode = st.toggle(
        "🇮🇳 Hinglish Mode",
        value=True,
        help="Enable auto-detection for mixed Hindi-English (Hinglish) speech"
    )
    
    st.divider()
    
    if st.button("🗑️ Clear Chat", use_container_width=True):
        st.session_state.messages = []
        st.session_state.last_audio_response = None
        st.rerun()

# --- TABS ---
tab_chat, tab_docs = st.tabs(["💬 Chat", "📄 Document Verification"])

# ========================================
# TAB 1: CHAT (Text + Audio)
# ========================================
with tab_chat:
    # --- Display chat history ---
    for i, message in enumerate(st.session_state.messages):
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            # Show audio player for assistant messages that have audio
            if message["role"] == "assistant" and message.get("audio_b64"):
                audio_bytes = base64.b64decode(message["audio_b64"])
                st.audio(audio_bytes, format="audio/mpeg")

    # ========================================
    # VOICE INPUT MODE
    # ========================================
    if input_mode == "🎙️ Voice":
        
        # --- Voice Mode Banner ---
        st.markdown("""
        <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px 20px;
            border-radius: 12px;
            margin-bottom: 15px;
            color: white;
            text-align: center;
        ">
            <h4 style="margin:0; color: white;">🎤 Voice Mode Active</h4>
            <p style="margin:5px 0 0 0; opacity:0.9; font-size:14px;">
                Speak in <b>English</b>, <b>Hindi</b>, or <b>Hinglish</b> — AI understands all!
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        # --- Mic Recorder ---
        try:
            from audio_recorder_streamlit import audio_recorder
            
            # Pipeline stages display
            col_mic, col_status = st.columns([1, 3])
            
            with col_mic:
                audio_bytes = audio_recorder(
                    text="",
                    recording_color="#e74c3c",
                    neutral_color="#667eea",
                    icon_size="3x",
                    pause_threshold=2.5,
                    sample_rate=16000,
                    key="voice_recorder"
                )
            
            with col_status:
                if audio_bytes is None:
                    st.markdown("""
                    <div style="padding: 20px; background: #f0f2f6; border-radius: 10px; text-align: center;">
                        <p style="margin: 0; font-size: 16px;">⬅️ Click the mic and start speaking</p>
                        <p style="margin: 5px 0 0 0; color: #888; font-size: 13px;">Recording stops automatically when you pause</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
        except ImportError:
            audio_bytes = None
            st.error("⚠️ Audio recorder not installed. Run: `pip install audio-recorder-streamlit`")
        
        # --- Process recorded audio through the FULL PIPELINE ---
        if audio_bytes and len(audio_bytes) > 100:
            
            # Show the user's audio
            with st.expander("🎧 Your Recording", expanded=False):
                st.audio(audio_bytes, format="audio/wav")
            
            # --- FULL PIPELINE: One call to /voice-chat ---
            pipeline_container = st.container()
            with pipeline_container:
                # Stage indicators
                stage_cols = st.columns(4)
                stages = [
                    ("🎤", "Transcribing"),
                    ("🧠", "Thinking"),
                    ("🔍", "Searching"),
                    ("🔊", "Speaking")
                ]
                stage_placeholders = []
                for idx, (icon, label) in enumerate(stages):
                    with stage_cols[idx]:
                        ph = st.empty()
                        ph.markdown(f"""
                        <div style="text-align:center; padding:8px; background:#f0f2f6; border-radius:8px; opacity:0.5;">
                            <span style="font-size:20px;">{icon}</span><br>
                            <small>{label}</small>
                        </div>
                        """, unsafe_allow_html=True)
                        stage_placeholders.append(ph)
                
                result_placeholder = st.empty()
                
                def highlight_stage(idx):
                    """Highlight the active stage."""
                    for i, (icon, label) in enumerate(stages):
                        opacity = "1.0" if i <= idx else "0.4"
                        bg = "linear-gradient(135deg, #667eea, #764ba2)" if i == idx else "#f0f2f6"
                        color = "white" if i == idx else "inherit"
                        check = " ✓" if i < idx else ""
                        stage_placeholders[i].markdown(f"""
                        <div style="text-align:center; padding:8px; background:{bg}; border-radius:8px; opacity:{opacity}; color:{color};">
                            <span style="font-size:20px;">{icon}</span><br>
                            <small>{label}{check}</small>
                        </div>
                        """, unsafe_allow_html=True)
                
                try:
                    # Activate stage 1: Transcribing
                    highlight_stage(0)
                    
                    # Determine language mode
                    stt_language = "auto" if hinglish_mode else lang_code
                    
                    # Call /voice-chat (returns text + audio together — edge-tts is fast)
                    files = {"audio": ("recording.wav", audio_bytes, "audio/wav")}
                    data = {
                        "language": stt_language,
                        "tts_language": language
                    }
                    
                    highlight_stage(1)
                    resp = requests.post(
                        f"{API_URL}/voice-chat",
                        files=files,
                        data=data,
                        timeout=60
                    )
                    
                    if resp.status_code == 200:
                        result = resp.json()
                        
                        transcribed = result.get("transcription", "")
                        answer = result.get("answer", "")
                        agent_used = result.get("agent_used", "general").upper()
                        detected_lang = result.get("detected_language", "unknown")
                        audio_b64 = result.get("audio_base64")
                        
                        highlight_stage(2)
                        
                        if not transcribed:
                            result_placeholder.warning("🤔 Couldn't understand. Please speak louder and try again.")
                        else:
                            highlight_stage(3)
                            
                            lang_label = {"en": "English", "hi": "Hindi"}.get(detected_lang, f"Detected: {detected_lang}")
                            result_placeholder.success(
                                f"📝 **You said** ({lang_label}): *\"{transcribed}\"*"
                            )
                            
                            # Add user message to chat
                            st.session_state.messages.append({
                                "role": "user",
                                "content": f"🎤 {transcribed}"
                            })
                            
                            full_answer = f"**🛡️ Agent: `{agent_used}`**\n\n{answer}"
                            msg_data = {"role": "assistant", "content": full_answer}
                            
                            # Display text + audio TOGETHER (no delay)
                            with st.chat_message("assistant"):
                                st.markdown(full_answer)
                                
                                if audio_b64 and enable_voice_response:
                                    msg_data["audio_b64"] = audio_b64
                                    audio_response_bytes = base64.b64decode(audio_b64)
                                    st.audio(audio_response_bytes, format="audio/mpeg", autoplay=True)
                            
                            st.session_state.messages.append(msg_data)
                    
                    elif resp.status_code == 400:
                        result_placeholder.warning("🎤 Audio too short. Please hold the mic and speak for at least 1–2 seconds.")
                    else:
                        result_placeholder.error(f"❌ Server error (Status {resp.status_code})")
                        with st.expander("Error Details"):
                            st.code(resp.text)
                            
                except requests.exceptions.Timeout:
                    result_placeholder.error("⏰ Request timed out. The server might be busy — try again.")
                except requests.exceptions.ConnectionError:
                    result_placeholder.error("🚨 Cannot reach the API server.")
                    st.info("Make sure the API is running: `python -m uvicorn scripts.api:app --reload --port 8000`")
                except Exception as e:
                    result_placeholder.error(f"🚨 Error: {e}")

    # ========================================
    # TEXT INPUT MODE (always available at bottom)
    # ========================================
    if prompt := st.chat_input("Ask about PMAY, Eligibility, or Documents..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            status_placeholder = st.empty()
            status_placeholder.markdown("🧠 *Orchestrator is analyzing intent...*")
            
            try:
                payload = {"question": prompt, "language": language}
                response = requests.post(f"{API_URL}/ask", json=payload, timeout=60)
                
                if response.status_code == 200:
                    data = response.json()
                    answer = data.get("answer", "No answer received.")
                    agent_name = data.get("agent_used", "General").upper()
                    
                    status_placeholder.markdown(f"**🛡️ Agent Active:** `{agent_name} Specialist`")
                    st.markdown(answer)
                    
                    msg_data = {"role": "assistant", "content": answer}
                    
                    # Voice response for text input too
                    if enable_voice_response:
                        with st.spinner("🔊 Generating audio..."):
                            tts_resp = requests.post(
                                f"{API_URL}/speak",
                                json={"text": answer, "language": language},
                                timeout=30
                            )
                            if tts_resp.status_code == 200:
                                audio_b64 = base64.b64encode(tts_resp.content).decode("utf-8")
                                msg_data["audio_b64"] = audio_b64
                                st.audio(tts_resp.content, format="audio/mpeg", autoplay=True)
                    
                    st.session_state.messages.append(msg_data)
                else:
                    status_placeholder.empty()
                    st.error(f"❌ Server Error (Status {response.status_code})")
                    st.code(response.text)
                    
            except Exception as e:
                status_placeholder.empty()
                st.error(f"🚨 Connection Error: {type(e).__name__}")
                st.info("Make sure the API server is running: `python -m uvicorn scripts.api:app --reload --port 8000`")

# ========================================
# TAB 2: DOCUMENT VERIFICATION
# ========================================
with tab_docs:
    st.header("📄 Document Verification Agent")
    st.markdown("Upload your documents and our AI will verify if they're valid for your chosen scheme.")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        uploaded_file = st.file_uploader(
            "Upload a document",
            type=["pdf", "jpg", "jpeg", "png"],
            help="Upload your Aadhaar, Income Certificate, Caste Certificate, or any other scheme document"
        )
    
    with col2:
        scheme_name = st.selectbox(
            "Select Scheme",
            [
                "PMAY (Pradhan Mantri Awas Yojana)",
                "Ladki Bahin Yojana",
                "PMAY-G (Gramin)",
                "Mahatma Jyotirao Phule Jan Arogya Yojana",
                "Maharashtra Swadhar Yojana",
                "Other"
            ]
        )
        
        if scheme_name == "Other":
            scheme_name = st.text_input("Enter scheme name:")
    
    if uploaded_file and scheme_name:
        if st.button("🔍 Verify Document", type="primary", use_container_width=True):
            with st.spinner("🧠 AI is analyzing your document..."):
                try:
                    files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
                    data = {
                        "scheme_name": scheme_name,
                        "session_id": st.session_state.session_id
                    }
                    
                    resp = requests.post(f"{API_URL}/verify-document", files=files, data=data, timeout=60)
                    
                    if resp.status_code == 200:
                        result = resp.json()
                        is_valid = result.get("is_valid", False)
                        
                        if is_valid:
                            st.success("✅ Document appears VALID for this scheme")
                        else:
                            st.warning("⚠️ Document may have issues — see details below")
                        
                        st.markdown("---")
                        st.markdown("### 🤖 Verification Analysis")
                        st.markdown(result.get("verification_result", "No result available."))
                        
                        with st.expander("📊 Details"):
                            st.json({
                                "filename": result.get("filename"),
                                "scheme": result.get("scheme_name"),
                                "is_valid": result.get("is_valid"),
                                "file_url": result.get("file_url"),
                                "record_id": result.get("record_id")
                            })
                    else:
                        st.error(f"❌ Verification failed (Status {resp.status_code})")
                        st.code(resp.text)
                        
                except Exception as e:
                    st.error(f"🚨 Error: {e}")
    
    # --- VERIFICATION HISTORY ---
    st.divider()
    st.subheader("📜 Verification History")
    
    try:
        hist_resp = requests.get(f"{API_URL}/verification-history/{st.session_state.session_id}", timeout=10)
        if hist_resp.status_code == 200:
            history = hist_resp.json().get("history", [])
            if history:
                for item in history:
                    status_icon = "✅" if item["is_valid"] else "❌"
                    with st.expander(f"{status_icon} {item['filename']} — {item['scheme_name']} ({item['uploaded_at'][:10]})"):
                        st.markdown(item["verification_result"])
                        if item.get("file_url"):
                            st.markdown(f"[📎 View Document]({item['file_url']})")
            else:
                st.caption("No documents verified yet in this session.")
        else:
            st.caption("Could not load history.")
    except:
        st.caption("ℹ️ Start the API server to see verification history.")