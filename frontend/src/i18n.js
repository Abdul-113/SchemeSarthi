import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  en: {
    translation: {
      "app_name": "Scheme Saarthi",
      "home": "Home",
      "chat": "Chat",
      "eligibility": "Check Eligibility",
      "documents": "Documents",
      "profile": "Profile",
      "about": "About",
      "dashboard": "Dashboard",
      "upload": "Upload",
      "ai_agent_online": "Online | English/Hindi/Marathi",
      "chat_greeting": "Hello! I am Scheme Saarthi. How can I assist you with government schemes today?",
      "voice_unsupported": "Voice chat is not supported in this browser. Try Chrome."
    }
  },
  hi: {
    translation: {
      "app_name": "नीति सार्थी",
      "home": "मुख्य पृष्ठ",
      "chat": "चैट",
      "eligibility": "पात्रता जांचें",
      "documents": "दस्तावेज़",
      "profile": "प्रोफ़ाइल",
      "about": "हमारे बारे में",
      "dashboard": "डैशबोर्ड",
      "upload": "अपलोड",
      "ai_agent_online": "ऑनलाइन | हिंदी/अंग्रेज़ी/मराठी",
      "chat_greeting": "नमस्ते! मैं नीति सार्थी हूँ। मैं आपकी सरकारी योजनाओं में कैसे मदद कर सकता हूँ?",
      "voice_unsupported": "इस ब्राउज़र में वॉइस चैट समर्थित नहीं है। क्रोम आज़माएं।"
    }
  },
  mr: {
    translation: {
      "app_name": "योजना सारथी",
      "home": "मुख्य पृष्ठ",
      "chat": "गप्पा",
      "eligibility": "पात्रता तपासा",
      "documents": "कागदपत्रे",
      "profile": "प्रोफाइल",
      "about": "आमच्याबद्दल",
      "dashboard": "डॅशबोर्ड",
      "upload": "अपलोड",
      "ai_agent_online": "ऑनलाइन | इंग्रजी/हिंदी/मराठी",
      "chat_greeting": "नमस्कार! मी योजना सारथी आहे. मी सरकारी योजनांमध्ये तुमची कशी मदत करू शकतो?",
      "voice_unsupported": "या ब्राउझरमध्ये व्हॉइस चॅट समर्थित नाही. क्रोम वापरून पहा."
    }
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
