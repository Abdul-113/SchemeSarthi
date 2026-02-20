import streamlit as st
import requests

# --- CONFIG ---
API_URL = "http://127.0.0.1:8000/ask"
PAGE_TITLE = "SchemeSaarthi AI 🇮🇳"
PAGE_ICON = "🚜"

# --- PAGE SETUP ---
st.set_page_config(page_title=PAGE_TITLE, page_icon=PAGE_ICON)
st.title(f"{PAGE_ICON} {PAGE_TITLE}")
st.markdown("### Your Personal Assistant for Government Schemes")

# --- SIDEBAR ---
with st.sidebar:
    st.header("⚙️ Settings")
    language = st.selectbox("Select Language", ["English", "Hindi", "Marathi"])
    st.info("Currently, the AI processes in English but we can add translation layers later!")
    
    if st.button("Clear Chat"):
        st.session_state.messages = []
        st.rerun()

# --- CHAT HISTORY ---
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display previous messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# --- USER INPUT ---
if prompt := st.chat_input("Ask about PMAY, Eligibility, or Documents..."):
    # 1. Show user message immediately
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # 2. Call the API (The Brain)
    with st.chat_message("assistant"):
        status_placeholder = st.empty() # Create a placeholder for status updates
        status_placeholder.markdown("🧠 *Orchestrator is analyzing intent...*")
        
        try:
            payload = {"question": prompt, "language": language}
            
            # Debug: helpful to see if it even tries to connect
            # st.write(f"Connecting to {API_URL}...") 

            response = requests.post(API_URL, json=payload)
            
            # 2. CHECK STATUS CODE FIRST
            if response.status_code == 200:
                data = response.json()
                answer = data.get("answer", "No answer received.")
                agent_name = data.get("agent_used", "General").upper()
                
                status_placeholder.markdown(f"**🛡️ Agent Active:** `{agent_name} Specialist`")
                st.markdown(answer)
                st.session_state.messages.append({"role": "assistant", "content": answer})
                
            else:
                # 3. If server failed, SHOW THE ERROR
                status_placeholder.empty()
                st.error(f"❌ Server Error (Status {response.status_code})")
                st.write("Server says:")
                st.code(response.text) # This prints the raw error message from the backend!
                
        except Exception as e:
            status_placeholder.empty()
            st.error(f"🚨 Connection Error: {type(e).__name__}")
            st.info("Make sure 'python -m uvicorn scripts.api:app --reload' is running in another terminal.")
            st.code(str(e))