import json
import os
import sys
import urllib.request
import urllib.error
from typing import Optional

from .config import set_token, clear_token, get_token, get_user_info

_API_URL = os.environ.get("AUTOTEST_API_URL", "https://autotest-backend-production.up.railway.app")
_DASHBOARD_URL = os.environ.get("AUTOTEST_DASHBOARD_URL", "https://autotest-dashboard.vercel.app")


def login() -> None:
    """Interactive login — user pastes a CLI token from the web dashboard."""
    print(f"\nOpen this URL in your browser:\n  {_DASHBOARD_URL}/login\n")
    print("After signing in, paste your CLI token here:")

    try:
        token = input("Token: ").strip()
    except (KeyboardInterrupt, EOFError):
        print("\nLogin cancelled.")
        return

    if not token:
        print("No token provided. Login cancelled.")
        return

    info = _verify_token(token)
    if info is None:
        print("Invalid or expired token. Please try again.")
        sys.exit(1)

    set_token(token, info["email"], info["plan"])
    print(f"\n  Logged in as {info['email']} ({info['plan'].title()} plan)")


def logout() -> None:
    """Clear stored credentials."""
    clear_token()
    print("  Logged out successfully.")


def whoami() -> None:
    """Print current login status to stdout."""
    token = get_token()
    if not token:
        print("Not logged in. Run: autotest login")
        return

    info = get_user_info()
    if info["email"]:
        print(f"Logged in as: {info['email']}")
        print(f"Plan:         {info['plan'].title()}")
    else:
        print("Logged in (run 'autotest login' to refresh your info)")


def _verify_token(token: str) -> Optional[dict]:
    """Call backend to verify token; return user info dict or None on failure."""
    req = urllib.request.Request(
        f"{_API_URL}/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError:
        return None
    except urllib.error.URLError:
        # Backend unreachable — save token anyway and warn
        print("Warning: Could not reach AutoTest server to verify token.")
        return {"email": "unknown", "plan": "unknown"}
