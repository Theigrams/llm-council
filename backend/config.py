"""Configuration for the LLM Council."""

import json
from pathlib import Path

# Find config file (check multiple locations)
CONFIG_PATHS = [
    Path(__file__).parent.parent / "llm_config.json",  # project root
    Path(__file__).parent / "llm_config.json",  # backend dir
    Path("llm_config.json"),  # current dir
]

_config = None

def load_config():
    """Load configuration from JSON file."""
    global _config
    if _config is not None:
        return _config

    for config_path in CONFIG_PATHS:
        if config_path.exists():
            with open(config_path, "r") as f:
                _config = json.load(f)
            return _config

    raise FileNotFoundError(
        f"Config file not found. Searched: {[str(p) for p in CONFIG_PATHS]}"
    )

def get_config():
    """Get the loaded configuration."""
    return load_config()

def reload_config():
    """Force reload configuration from file."""
    global _config
    _config = None
    return load_config()

def get_model_config(model_name: str) -> dict:
    """Get configuration for a specific model."""
    config = get_config()
    if model_name not in config["models"]:
        raise ValueError(f"Model '{model_name}' not found in config")
    return config["models"][model_name]

# Convenience accessors
def get_council_models() -> list:
    """Get list of council model names."""
    return get_config()["council"]

def get_chairman_model() -> str:
    """Get chairman model name."""
    return get_config()["chairman"]

def get_title_generator_model() -> str:
    """Get title generator model name."""
    return get_config()["title_generator"]

# Data directory for conversation storage
DATA_DIR = "data/conversations"
