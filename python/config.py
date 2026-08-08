import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "5000"))
    DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"

    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")
    DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))

    CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-4-8")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    ENABLE_REMOTE_LLM = os.getenv("ENABLE_REMOTE_LLM", "0") == "1"
