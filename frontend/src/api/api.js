const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
const API_ROOT = 'http://127.0.0.1:8000';

/**
 * Sends a query to the Scheme Saarthi backend API.
 */
export const fetchSchemeData = async (queryText, queryType = "general", contextDocuments = []) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query_text: queryText,
        query_type: queryType,
        context_documents: contextDocuments
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error communicating with Scheme Saarthi API:", error);
    throw error;
  }
};

/**
 * Convert text to speech using Edge-TTS (returns audio Blob).
 * @param {string} text - Text to speak
 * @param {string} language - "English" or "Hindi"
 * @returns {Promise<Blob>} MP3 audio blob
 */
export const speakText = async (text, language = "English") => {
  const response = await fetch(`${API_ROOT}/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language })
  });

  if (!response.ok) throw new Error(`TTS Error: ${response.status}`);
  return await response.blob();
};

/**
 * Transcribe audio using Groq Whisper.
 * @param {Blob} audioBlob - Audio blob from recording
 * @param {string} language - "en", "hi", or "auto"
 * @returns {Promise<Object>} { text, language }
 */
export const transcribeAudio = async (audioBlob, language = "auto") => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
  formData.append('language', language);

  const response = await fetch(`${API_ROOT}/transcribe`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error(`STT Error: ${response.status}`);
  return await response.json();
};

/**
 * Verify a document against a scheme using the backend.
 * @param {File} file - The document file
 * @param {string} schemeName - Name of the scheme
 * @returns {Promise<Object>} Verification result
 */
export const verifyDocument = async (file, schemeName = "General") => {
  const formData = new FormData();
  formData.append('file', file); // Matches backend `file: UploadFile = File(...)`
  formData.append('scheme_name', schemeName);

  const response = await fetch(`${API_ROOT}/verify-document`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error(`Verification Error: ${response.status}`);
  return await response.json();
};

/**
 * Analyze rejection risk based on user profile and documents.
 * @param {Object} formDataParams - { scheme_name, state, income, category, files }
 * @returns {Promise<Object>} Risk analysis result
 */
export const analyzeRisk = async ({ schemeName, state, income, category, files }) => {
  const formData = new FormData();
  formData.append('scheme_name', schemeName || "General");
  formData.append('state', state);
  formData.append('income', income);
  formData.append('category', category);
  
  if (files && files.length > 0) {
    for (const file of files) {
      formData.append('documents', file); // Maps to `documents: list[UploadFile]`
    }
  }

  const response = await fetch(`${API_BASE_URL}/analyze-risk`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error(`Risk Analysis Error: ${response.status}`);
  return await response.json();
};

// --- Document Vault & User Profile --- //

import { useAuthStore } from '../stores/userStore';

export const getUserId = () => {
    // Use real Supabase user_id from auth session
    const userId = useAuthStore.getState().getUserId();
    if (!userId) throw new Error('User not authenticated. Please sign in.');
    return userId;
};

export const uploadVaultDocument = async (file, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('user_id', getUserId());

    const response = await fetch(`${API_BASE_URL}/vault/upload-document`, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) throw new Error('Failed to upload document to vault');
    return response.json();
};

export const deleteVaultDocument = async (docId) => {
    const response = await fetch(`${API_BASE_URL}/vault/documents/${docId}?user_id=${getUserId()}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete document');
    return response.json();
};

export const getDocumentDetail = async (docId) => {
    const response = await fetch(`${API_BASE_URL}/vault/document/${docId}?user_id=${getUserId()}`);
    if (!response.ok) throw new Error('Failed to fetch document details');
    return response.json();
};

export const updateVaultProfile = async (data) => {
    const response = await fetch(`${API_BASE_URL}/vault/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: getUserId(),
            data: data
        })
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
};

export const getVaultProfile = async () => {
    const response = await fetch(`${API_BASE_URL}/vault/profile/${getUserId()}`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
};

export const autofillVaultForm = async (schemeName) => {
    const response = await fetch(`${API_BASE_URL}/vault/autofill/${encodeURIComponent(schemeName)}?user_id=${getUserId()}`);
    if (!response.ok) throw new Error('Failed to fetch autofill mappings');
    return response.json();
};

export const checkEligibility = async (formData) => {
    const userId = (() => {
        try { return getUserId(); } catch { return null; }
    })();
    const response = await fetch(`${API_BASE_URL}/eligibility/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, user_id: userId })
    });
    if (!response.ok) throw new Error('Eligibility check failed');
    return response.json();
};

export const getVaultEligibilityPrefill = async () => {
    const userId = getUserId();
    const response = await fetch(`${API_BASE_URL}/eligibility/vault-prefill/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch vault prefill data');
    return response.json();
};
