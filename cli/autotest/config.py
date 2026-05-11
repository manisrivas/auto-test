import json
import os
from pathlib import Path
from typing import Optional

CONFIG_DIR = Path.home() / ".autotest"
CONFIG_FILE = CONFIG_DIR / "config.json"


def _load() -> dict:
    if not CONFIG_FILE.exists():
        return {}
    try:
        with open(CONFIG_FILE) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def _save(data: dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=2)
    try:
        CONFIG_FILE.chmod(0o600)
    except OSError:
        pass  # Windows may not support chmod


def get_token() -> Optional[str]:
    """Return stored AUTOTEST_TOKEN from env or config file."""
    return os.environ.get("AUTOTEST_TOKEN") or _load().get("token") or None


def set_token(token: str, email: str, plan: str) -> None:
    """Persist login credentials to ~/.autotest/config.json."""
    data = _load()
    data.update({"token": token, "email": email, "plan": plan})
    _save(data)


def clear_token() -> None:
    """Remove login credentials from config (logout)."""
    data = _load()
    for key in ("token", "email", "plan"):
        data.pop(key, None)
    _save(data)


def get_user_info() -> dict:
    """Return stored email and plan; empty strings if not set."""
    data = _load()
    return {"email": data.get("email", ""), "plan": data.get("plan", "free")}
