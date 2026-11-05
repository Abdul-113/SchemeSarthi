import os
import sys
import psycopg2
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

def get_connection():
    """Get a connection to the Neon PostgreSQL database."""
    return psycopg2.connect(os.getenv("NEON_DATABASE_URL"))

def init_db():
    conn = get_connection()
    cur = conn.cursor()
    # Existing table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS document_verifications (
            id SERIAL PRIMARY KEY,
            session_id TEXT,
            filename TEXT NOT NULL,
            file_type TEXT,
            scheme_name TEXT,
            file_url TEXT,
            extracted_text TEXT,
            verification_result TEXT,
            is_valid BOOLEAN,
            uploaded_at TIMESTAMP DEFAULT NOW()
        );
    """)

    # --- Phase 1: New Tables for Document Vault & Auto-fill ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id),
            file_url TEXT,
            doc_type TEXT,
            filename TEXT,
            extraction_status TEXT DEFAULT 'pending',
            uploaded_at TIMESTAMP DEFAULT NOW()
        );
    """)
    # Add extraction_status column if table already exists without it
    try:
        cur.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'pending';")
    except Exception:
        pass
    cur.execute("""
        CREATE TABLE IF NOT EXISTS extracted_data (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id),
            document_id UUID REFERENCES documents(id),
            data JSONB DEFAULT '{}',
            name TEXT,
            dob TEXT,
            address TEXT,
            income TEXT,
            aadhaar_number TEXT,
            confidence JSONB,
            raw_text TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    # Add data column if table already exists without it
    try:
        cur.execute("ALTER TABLE extracted_data ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';")
    except Exception:
        pass
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_profile (
            user_id UUID PRIMARY KEY REFERENCES users(id),
            name TEXT,
            dob TEXT,
            address TEXT,
            income TEXT,
            aadhaar_number TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
        );
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("[DB] Neon DB initialized - all tables ready.")

# --- Existing Functions ---
def save_verification(session_id, filename, file_type, scheme_name, file_url, extracted_text, verification_result, is_valid):
    """Save a document verification record to Neon DB."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO document_verifications 
        (session_id, filename, file_type, scheme_name, file_url, extracted_text, verification_result, is_valid)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """, (session_id, filename, file_type, scheme_name, file_url, extracted_text, verification_result, is_valid))
    record_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return record_id

def get_session_history(session_id):
    """Get all document verification records for a session."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, filename, scheme_name, verification_result, is_valid, uploaded_at, file_url
        FROM document_verifications 
        WHERE session_id = %s 
        ORDER BY uploaded_at DESC;
    """, (session_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

# --- New Functions for Document Vault ---
def ensure_user_exists(user_id):
    """Ensure a user UUID exists in the users table."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO users (id) VALUES (%s) ON CONFLICT (id) DO NOTHING;", (user_id,))
    conn.commit()
    cur.close()
    conn.close()

def save_vault_document(doc_id, user_id, file_url, doc_type, filename):
    ensure_user_exists(user_id)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO documents (id, user_id, file_url, doc_type, filename, extraction_status)
        VALUES (%s, %s, %s, %s, %s, 'pending');
    """, (doc_id, user_id, file_url, doc_type, filename))
    conn.commit()
    cur.close()
    conn.close()

def update_extraction_status(doc_id, status):
    """Update the extraction status of a document (pending/completed/failed)."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE documents SET extraction_status = %s WHERE id = %s;", (status, doc_id))
    conn.commit()
    cur.close()
    conn.close()

def delete_vault_document(doc_id, user_id):
    conn = get_connection()
    cur = conn.cursor()
    # Delete extracted data and document
    cur.execute("DELETE FROM extracted_data WHERE document_id = %s", (doc_id,))
    cur.execute("DELETE FROM documents WHERE id = %s AND user_id = %s", (doc_id, user_id))
    deleted = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()
    return deleted > 0

def save_extracted_data(ext_id, user_id, document_id, data, raw_text):
    conn = get_connection()
    cur = conn.cursor()
    import json
    cur.execute("""
        INSERT INTO extracted_data 
        (id, user_id, document_id, data, name, dob, address, income, aadhaar_number, confidence, raw_text)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """, (
        ext_id, user_id, document_id,
        json.dumps(data),
        data.get("name"), data.get("dob", data.get("date_of_birth")),
        data.get("address"),
        data.get("income", data.get("annual_income")),
        data.get("aadhaar_number", data.get("aadhaar")),
        json.dumps(data.get("confidence", {})), raw_text
    ))
    conn.commit()
    cur.close()
    conn.close()

def update_user_profile(user_id, data):
    ensure_user_exists(user_id)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO user_profile (user_id, name, dob, address, income, aadhaar_number, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (user_id) DO UPDATE SET 
            name = COALESCE(EXCLUDED.name, user_profile.name),
            dob = COALESCE(EXCLUDED.dob, user_profile.dob),
            address = COALESCE(EXCLUDED.address, user_profile.address),
            income = COALESCE(EXCLUDED.income, user_profile.income),
            aadhaar_number = COALESCE(EXCLUDED.aadhaar_number, user_profile.aadhaar_number),
            updated_at = NOW();
    """, (
        user_id, 
        data.get("name"), data.get("dob"), data.get("address"), 
        data.get("income"), data.get("aadhaar_number")
    ))
    conn.commit()
    cur.close()
    conn.close()

def get_user_profile(user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT name, dob, address, income, aadhaar_number
        FROM user_profile WHERE user_id = %s;
    """, (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return None
    return {
        "name": row[0], "dob": row[1], "address": row[2], 
        "income": row[3], "aadhaar_number": row[4]
    }

def get_aggregated_vault_data(user_id):
    """
    Fetch all dynamically extracted fields across all 'completed' documents
    in the user's vault, merging them into a single comprehensive dictionary.
    Includes normalization to map variations (like DATE_OF_BIRTH) to standard keys.
    """
    conn = get_connection()
    cur = conn.cursor()
    import json as _json
    cur.execute("""
        SELECT e.data
        FROM extracted_data e
        JOIN documents d ON e.document_id = d.id
        WHERE d.user_id = %s AND d.extraction_status = 'completed'
        ORDER BY d.uploaded_at ASC;
    """, (user_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    # Mapping for field normalization
    NORMALIZATION_MAP = {
        "dob": "dob", "date_of_birth": "dob", "birth_date": "dob", "d_o_b": "dob",
        "name": "name", "full_name": "name", "applicant_name": "name", "name_of_the_applicant": "name",
        "aadhaar_number": "aadhaar_number", "aadhaar": "aadhaar_number", "aadhaar_no": "aadhaar_number",
        "income": "income", "annual_income": "income", "family_income": "income",
        "address": "address", "permanent_address": "address", "current_address": "address"
    }

    aggregated = {}
    for row in rows:
        data = row[0]
        if not data:
            continue
        if isinstance(data, str):
            try:
                data = _json.loads(data)
            except Exception:
                continue
        
        # Merge dicts with normalization
        for k, v in data.items():
            if v and str(v).strip():
                # Normalize key: lowercase, replace space/dot with underscore
                norm_key = k.lower().replace(" ", "_").replace(".", "_")
                standard_key = NORMALIZATION_MAP.get(norm_key, k)
                aggregated[standard_key] = v
                
    return aggregated

def get_user_documents(user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT d.id, d.filename, d.doc_type, d.file_url, d.uploaded_at, d.extraction_status
        FROM documents d
        WHERE d.user_id = %s
        ORDER BY d.uploaded_at DESC;
    """, (user_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    docs = []
    for row in rows:
        docs.append({
            "id": row[0], "filename": row[1], "doc_type": row[2], "file_url": row[3],
            "uploaded_at": str(row[4]), "extraction_status": row[5] or "pending"
        })
    return docs

def get_document_detail(doc_id, user_id):
    """Get a single document with its extracted data (JSONB) for the detail view."""
    conn = get_connection()
    cur = conn.cursor()
    import json as _json
    cur.execute("""
        SELECT d.id, d.filename, d.doc_type, d.file_url, d.uploaded_at, d.extraction_status,
               e.data, e.raw_text
        FROM documents d
        LEFT JOIN extracted_data e ON d.id = e.document_id
        WHERE d.id = %s AND d.user_id = %s;
    """, (doc_id, user_id))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return None
    
    # Parse JSONB data  
    extracted = row[6] if row[6] else {}
    if isinstance(extracted, str):
        try:
            extracted = _json.loads(extracted)
        except Exception:
            extracted = {}
    
    return {
        "id": row[0], "filename": row[1], "doc_type": row[2], "file_url": row[3],
        "uploaded_at": str(row[4]), "extraction_status": row[5] or "pending",
        "extracted_data": extracted,
        "raw_text": row[7] or ""
    }
