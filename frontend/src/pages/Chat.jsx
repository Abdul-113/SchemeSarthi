import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MicrophoneIcon, PaperAirplaneIcon, ShieldExclamationIcon, LightBulbIcon, DocumentCheckIcon, SparklesIcon, TrashIcon, PaperClipIcon, DocumentIcon, XMarkIcon, SpeakerWaveIcon, StopIcon } from '@heroicons/react/24/solid';
import GlassCard from '../components/GlassCard';
import { useTranslation } from 'react-i18next';
import { fetchSchemeData, speakText, verifyDocument, transcribeAudio } from '../api/api';

const Chat = () => {
  const { t, i18n } = useTranslation();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [autoVoice, setAutoVoice] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const audioRef = useRef(null);
  
  // MediaRecorder refs for robust voice input
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Update initial greeting when language changes
  useEffect(() => {
    setMessages(prev => {
      const greetingMsg = { id: 1, text: t('chat_greeting'), sender: 'ai', isGreeting: true, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
      if (prev.length === 0) return [greetingMsg];
      const newMessages = [...prev];
      if (newMessages[0].isGreeting) {
        newMessages[0].text = t('chat_greeting');
      }
      return newMessages;
    });
  }, [i18n.language, t]);

  const quickReplies = ['PMAY Help', 'Document Issues', 'Check Eligibility'];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Robust Voice Input using MediaRecorder + Backend Whisper API
  const toggleListening = async () => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          try {
            const lang = i18n.language === 'hi' ? 'hi' : (i18n.language === 'mr' ? 'mr' : 'en');
            const result = await transcribeAudio(audioBlob, lang);
            if (result.text) {
              setInput(prev => (prev + ' ' + result.text).trim());
            }
          } catch (err) {
            console.error('Transcription error:', err);
            alert("Could not transcribe audio. Please ensure the backend is running.");
          }
          // release microphone
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsListening(true);
      } catch (err) {
        console.error("Microphone access denied or unsupported:", err);
        alert("Please allow microphone access to use voice typing.");
      }
    }
  };

  // --- TTS: Play audio for a message ---
  const handleSpeak = async (text, msgId) => {
    // If already playing this message, stop it
    if (playingAudioId === msgId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingAudioId(null);
      return;
    }

    try {
      setPlayingAudioId(msgId);
      const lang = i18n.language === 'hi' ? 'Hindi' : 'English';
      // Truncate long text — send first ~500 chars for TTS
      const ttsText = text.length > 500 ? text.substring(0, 500) + '...' : text;
      const audioBlob = await speakText(ttsText, lang);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingAudioId(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setPlayingAudioId(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setPlayingAudioId(null);
    }
  };

  // --- Document Verification ---
  const handleVerifyFiles = async (files, originalFiles) => {
    const verificationResults = [];
    for (const file of originalFiles) {
      try {
        const result = await verifyDocument(file, "General");
        verificationResults.push({
          fileName: file.name,
          ...result
        });
      } catch (err) {
        verificationResults.push({
          fileName: file.name,
          error: err.message
        });
      }
    }
    return verificationResults;
  };

  const handleSend = async (text) => {
    if (!text.trim() && attachedFiles.length === 0) return;
    
    // Process attached files metadata
    const fileData = attachedFiles.map(f => ({
      name: f.name,
      id: Date.now() + Math.random(),
      size: (f.size / 1024).toFixed(1) + ' KB',
      date: new Date().toLocaleDateString()
    }));

    // Add to Document Vault in localStorage
    const savedVault = JSON.parse(localStorage.getItem('saarthi_vault') || '[]');
    localStorage.setItem('saarthi_vault', JSON.stringify([...savedVault, ...fileData]));

    // Add user message
    const userMsgId = Date.now();
    setMessages(prev => [...prev, { 
      id: userMsgId, 
      text, 
      files: fileData,
      sender: 'user', 
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    }]);

    // Save originals for verification before clearing
    const originalFiles = [...attachedFiles];
    setInput('');
    setAttachedFiles([]);
    setIsTyping(true);

    // If files are attached, run document verification in parallel with chat
    let verificationPromise = null;
    if (originalFiles.length > 0) {
      verificationPromise = handleVerifyFiles(fileData, originalFiles);
    }

    const query = text + (fileData.length > 0 ? ` (Uploaded documents: ${fileData.map(f => f.name).join(', ')})` : '');

    try {
      const response = await fetchSchemeData(query, "general");
      const aiMsgId = Date.now();
      
      setMessages(prev => [...prev, { 
        id: aiMsgId, 
        isStructured: true,
        data: response,
        sender: 'ai', 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      }]);

      // Auto-play voice if enabled
      if (autoVoice && response.likely_reasoning) {
        handleSpeak(response.likely_reasoning, aiMsgId);
      }

      // If we had files, show verification results
      if (verificationPromise) {
        const verResults = await verificationPromise;
        setMessages(prev => [...prev, {
          id: Date.now(),
          isVerification: true,
          verificationData: verResults,
          sender: 'ai',
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }]);
      }

    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: "I'm sorry, I couldn't reach the server. Please ensure the backend is running.", 
        sender: 'ai', 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAudioId(null);
    setMessages([
      { id: Date.now(), text: t('chat_greeting'), sender: 'ai', isGreeting: true, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
    ]);
  };

  // Get text content from structured message for TTS
  const getMessageText = (msg) => {
    if (msg.isStructured && msg.data) {
      return msg.data.likely_reasoning || msg.data.understanding || '';
    }
    return msg.text || '';
  };

  // --- Render verification result card ---
  const renderVerificationCard = (result, index) => {
    const isError = !!result.error;
    const verdict = result.verification_result?.verdict || result.verdict || 'UNKNOWN';
    const verdictColor = verdict === 'VALID' ? 'text-green-400 bg-green-500/20' : 
                          verdict === 'INVALID' ? 'text-red-400 bg-red-500/20' : 
                          'text-yellow-400 bg-yellow-500/20';

    return (
      <div key={index} className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocumentCheckIcon className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold truncate max-w-[150px]">{result.fileName}</span>
          </div>
          {!isError && (
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${verdictColor}`}>
              {verdict}
            </span>
          )}
        </div>
        {isError ? (
          <p className="text-xs text-red-300">Verification failed: {result.error}</p>
        ) : (
          <p className="text-xs text-gray-300 leading-relaxed">
            {result.verification_result?.analysis || result.analysis || 'Document processed.'}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col relative pb-4 min-h-[70vh]">
      <GlassCard className="flex items-center justify-between gap-3 rounded-b-none py-3 sm:py-4 relative z-10 border-b-0 px-4 sm:px-6 shadow-sm border-gray-100 bg-white">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#8B5CF6] p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-white rounded-[14px] flex justify-center items-center font-black text-[#4F46E5] text-lg sm:text-xl relative">
              S
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 italic">Saarthi AI Agent</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">{t('ai_agent_online')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto Voice Toggle */}
          <button 
            onClick={() => setAutoVoice(!autoVoice)}
            className={`p-2 rounded-xl transition-all ${autoVoice ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            title={autoVoice ? "Auto-voice ON" : "Auto-voice OFF"}
          >
            <SpeakerWaveIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={handleClearChat} className="p-2 sm:p-2.5 bg-gray-100 hover:bg-red-50 rounded-xl transition-all text-gray-500 hover:text-red-500" title="Clear Chat">
            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </GlassCard>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 bg-gray-50/50 backdrop-blur-sm border-x border-gray-100 min-h-[400px] sm:min-h-[500px]" ref={scrollRef}>
        {messages.map((msg) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id} 
            className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[95%] sm:max-w-[85%] px-5 sm:px-6 py-4 sm:py-5 rounded-3xl ${
              msg.sender === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md' 
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
            }`}>
              
              {/* Attached Files */}
              {msg.files && msg.files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {msg.files.map((file, i) => (
                    <div key={i} className="bg-white/10 p-2 rounded-xl flex items-center gap-2 border border-white/10 shrink-0">
                      <DocumentIcon className="w-5 h-5 text-white/70" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold truncate max-w-[100px]">{file.name}</span>
                        <span className="text-[8px] opacity-60">{file.size}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Verification Results */}
              {msg.isVerification && msg.verificationData && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-blue-300 flex items-center gap-2 text-sm">
                    <DocumentCheckIcon className="w-4 h-4" /> Document Verification
                  </h4>
                  {msg.verificationData.map((res, idx) => renderVerificationCard(res, idx))}
                </div>
              )}

              {/* Plain text message */}
              {!msg.isStructured && !msg.isVerification ? (
                <p className="text-sm md:text-base whitespace-pre-wrap">{msg.text}</p>
              ) : msg.isStructured ? (
                <div className="space-y-4 text-sm md:text-base">
                  {/* Confidence Badge */}
                  {msg.data.confidence && (
                    <div className="flex justify-end mb-2">
                       <span className="bg-[#4F46E5]/10 text-[#4F46E5] text-xs px-2 py-1 rounded-full font-semibold">
                         Confidence: {msg.data.confidence}%
                       </span>
                    </div>
                  )}

                  {/* Proactive Risk Analysis */}
                  {msg.data.risk_analysis && (
                    <div className={`p-4 rounded-xl border-l-4 ${
                      msg.data.risk_analysis.level === 'HIGH' ? 'bg-red-50 border-red-500' :
                      msg.data.risk_analysis.level === 'MEDIUM' ? 'bg-saffron-50 border-saffron-500' :
                      'bg-green-50 border-green-500'
                    }`}>
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <ShieldExclamationIcon className={`w-5 h-5 ${
                          msg.data.risk_analysis.level === 'HIGH' ? 'text-red-500' :
                          msg.data.risk_analysis.level === 'MEDIUM' ? 'text-saffron-500' :
                          'text-green-500'
                        }`} />
                        Before applying, here is your risk analysis:
                      </h4>
                      <p className="font-bold text-gray-800 mb-2">
                        Risk Score: {msg.data.risk_analysis.level} ({msg.data.risk_analysis.score}%)
                      </p>
                      
                      {msg.data.risk_analysis.issues?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-sm font-semibold text-gray-700">Reasons:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {msg.data.risk_analysis.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
                          </ul>
                        </div>
                      )}
                      
                      {msg.data.risk_analysis.fixes?.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700">Would you like to fix these before applying?</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {msg.data.risk_analysis.fixes.map((fix, idx) => <li key={idx}>{fix}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Understanding */}
                  {msg.data.understanding && (
                    <div className="bg-black/5 p-3 rounded-xl border border-black/5">
                      <p className="text-gray-800">{msg.data.understanding}</p>
                    </div>
                  )}

                  {/* Reasoning */}
                  {msg.data.likely_reasoning && (
                    <div className="mt-2 text-gray-800 leading-relaxed space-y-2">
                      {msg.data.likely_reasoning.split('\\n').map((paragraph, i) => (
                        <p key={i} className="mb-2">{paragraph.replace(/\\*/g, '')}</p>
                      ))}
                    </div>
                  )}

                  {/* Problems Found */}
                  {msg.data.problems_found && msg.data.problems_found.length > 0 && (
                    <div className="border-l-2 border-l-red-500 pl-3 py-1">
                      <h4 className="font-semibold text-red-700 flex items-center gap-1 mb-1"><ShieldExclamationIcon className="w-4 h-4"/> Problems Found</h4>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {msg.data.problems_found.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Document Check */}
                  {msg.data.document_check && msg.data.document_check.length > 0 && (
                    <div className="border-l-2 border-l-purple-500 pl-3 py-1">
                      <h4 className="font-semibold text-purple-700 flex items-center gap-1 mb-1"><DocumentCheckIcon className="w-4 h-4"/> Document Check</h4>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {msg.data.document_check.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Next Steps */}
                  {msg.data.next_steps && msg.data.next_steps.length > 0 && (
                    <div className="border-l-2 border-l-green-500 pl-3 py-1">
                      <h4 className="font-semibold text-green-700 flex items-center gap-1 mb-1"><LightBulbIcon className="w-4 h-4"/> Next Steps</h4>
                      <ul className="list-decimal list-inside text-gray-700 space-y-1">
                        {msg.data.next_steps.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* 🔊 Listen Button */}
                  <div className="flex justify-end pt-1">
                    <button 
                      onClick={() => handleSpeak(getMessageText(msg), msg.id)}
                      className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all ${
                        playingAudioId === msg.id 
                          ? 'bg-[#4F46E5] text-white shadow-lg shadow-indigo-500/30' 
                          : 'bg-black/5 hover:bg-black/10 text-gray-700'
                      }`}
                    >
                      {playingAudioId === msg.id ? (
                        <><StopIcon className="w-3.5 h-3.5" /> Stop</>
                      ) : (
                        <><SpeakerWaveIcon className="w-3.5 h-3.5" /> Listen</>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className={`text-[10px] mt-2 text-right ${msg.sender === 'user' ? 'text-saffron-200' : 'text-gray-400'}`}>
                {msg.time}
              </div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <GlassCard className="rounded-t-none pt-3 sm:pt-4 pb-3 sm:pb-4 border-gray-100 bg-white">
        {/* Quick Replies */}
        <div className="flex gap-2 mb-3 sm:mb-4 overflow-x-auto pb-2 scrollbar-none px-1">
          {quickReplies.map((reply, i) => (
            <button 
              key={i}
              onClick={() => handleSend(reply)}
              className="shrink-0 bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-medium text-xs px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              {reply}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            onChange={handleFileSelect}
            accept="image/*,.pdf"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors shrink-0"
            title="Attach documents"
          >
            <PaperClipIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button 
            onClick={toggleListening}
            className={`p-3 rounded-xl transition-all shrink-0 ${
              isListening ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600'
            }`}
            title={isListening ? "Stop listening" : "Start voice dictation"}
          >
            <MicrophoneIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="flex-1 relative flex flex-col min-w-0">
            {attachedFiles.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto w-full p-3 bg-white shadow-xl border border-gray-100 rounded-2xl">
                {attachedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 shadow-sm">
                    <DocumentIcon className="w-4 h-4 text-indigo-500" />
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button onClick={() => removeAttachedFile(i)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 ml-1 transition-colors">
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder={t('chat') + "..."}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm sm:text-base font-medium shadow-inner"
            />
          </div>
          <button 
            onClick={() => handleSend(input)}
            className={`p-3 sm:p-3.5 rounded-2xl transition-all duration-200 ${input.trim() || attachedFiles.length > 0 ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_8px_16px_-6px_rgba(79,70,229,0.5)] hover:shadow-[0_12px_20px_-8px_rgba(79,70,229,0.6)] hover:-translate-y-0.5' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            <PaperAirplaneIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default Chat;
