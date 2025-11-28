"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# LLM API key
LLM_API_KEY = os.getenv("LLM_API_KEY")

# Council members - list of model identifiers
COUNCIL_MODELS = [
    "gpt-5.1",
    "gemini-3-pro-preview",
    "claude-opus-4-5-20251101-thinking",
    "grok-4-fast-reasoning",
]

# Chairman model - synthesizes final response
CHAIRMAN_MODEL = "gemini-3-pro-preview"

# LLM API endpoint (OpenAI-compatible)
LLM_API_URL = "https://api.bltcy.ai/v1/chat/completions"

# Data directory for conversation storage
DATA_DIR = "data/conversations"
