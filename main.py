"""
FastAPI Server for 'What Did I Miss?'
Serves the REST API and the frontend Single-Page Application (SPA).
"""

import os
import json
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv

from models import AnalyzeRequest, ChatAnalysisResult
import ai_service

# Load environment variables from .env if present
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("what_did_i_miss")

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="What Did I Miss? - AI Chat Summarizer",
    description="Intelligent AI briefing for overwhelming group chats. Extract tasks, deadlines, decisions, and mentions in seconds.",
    version="1.0.0"
)

# Enable CORS for local testing and hackathon judging environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder for assets, CSS, and JS
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", response_class=FileResponse)
async def serve_index():
    """Serves the main application landing page and dashboard."""
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Frontend index.html not found.")
    return FileResponse(str(index_file))


@app.get("/api/health")
async def health_check():
    """System health and AI configuration status."""
    has_env_key = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    return {
        "status": "healthy",
        "service": "What Did I Miss?",
        "gemini_api_configured": has_env_key,
        "mode": "live_gemini" if has_env_key else "smart_offline_engine"
    }


@app.get("/api/demo-chats")
async def get_demo_chats():
    """Returns sample hackathon and team conversations for instant evaluation."""
    demo_file = STATIC_DIR / "demo_chats.json"
    if not demo_file.exists():
        return {}
    with open(demo_file, "r", encoding="utf-8") as f:
        return json.load(f)


@app.post("/api/analyze", response_model=ChatAnalysisResult)
async def analyze_conversation(payload: AnalyzeRequest):
    """
    Main AI endpoint. Analyzes chat text and returns structured summary,
    action items, deadlines, announcements, decisions, mentions, and uncertainties.
    """
    raw_text = payload.text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Please provide a conversation to analyze.")

    # Guardrail: Maximum 250,000 characters (approx 50,000 words) to prevent memory exhaustion
    if len(raw_text) > 250000:
        raise HTTPException(
            status_code=413,
            detail="Chat input is too large (exceeds 250,000 characters). Please paste a shorter excerpt."
        )

    logger.info(f"Analyzing chat: {len(raw_text)} chars, target_user: '{payload.user_name or 'None'}'")
    
    try:
        result = ai_service.analyze_chat(
            text=raw_text,
            user_name=payload.user_name,
            api_key=payload.api_key
        )
        return result
    except Exception as e:
        logger.error(f"Analysis processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")


@app.post("/api/upload")
async def upload_chat_file(file: UploadFile = File(...)):
    """
    Secure file upload endpoint.
    Restricted to text files, size limit 2MB, strictly in-memory processing.
    """
    MAX_BYTES = 2 * 1024 * 1024  # 2 Megabytes
    allowed_extensions = {".txt", ".chat", ".log", ".csv", ".json", ".md"}

    filename = file.filename or "uploaded_chat.txt"
    ext = Path(filename).suffix.lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported formats: .txt, .chat, .log, .csv, .md, .json"
        )

    content_bytes = await file.read()
    if len(content_bytes) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds maximum allowed size of 2MB.")

    # Attempt safe UTF-8 decoding (fallback to latin-1 if legacy export)
    try:
        text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content_bytes.decode("latin-1")
        except Exception:
            raise HTTPException(status_code=400, detail="Unable to decode file as plain text.")

    return {
        "filename": filename,
        "size_bytes": len(content_bytes),
        "text": text
    }


@app.get("/api/privacy")
async def privacy_statement():
    """Discloses exact data handling practices for judges and privacy-conscious users."""
    return {
        "data_retention": "Zero permanent storage. Conversations are processed in-memory and discarded upon response.",
        "logging_policy": "No raw conversation content or sensitive identifiers are written to permanent server logs.",
        "file_handling": "Uploaded files are parsed strictly in RAM and never written to disk.",
        "ai_processing": "Processed via Google Gemini API if a user key is provided, or completely locally via the offline deterministic engine.",
        "security_note": "No end-to-end encryption is claimed for HTTP transmission; standard TLS/HTTPS should be used in production."
    }


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    print(f"\n🚀 Launching 'What Did I Miss?' at http://{host}:{port}\n")
    uvicorn.run("main:app", host=host, port=port, reload=True)
