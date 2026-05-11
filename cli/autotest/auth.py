import json
import os
import sys
import urllib.request
import urllib.error
from typing import Optional

from .config import set_token, clear_token, get_token, get_user_info

_API_URL = os.environ.get("AUTOTEST_API_URL", "https://auto-test-production-64b6.up.railway.app")


def login() -> None:
    """Interactive login — prompts for email and password."""
    print("\nAutoTest Login")
    print("-" * 30)

    try:
        email = input("Email: ").strip()
        if not email:
            print("Email required.")
            return
        import getpass
        password = getpass.getpass("Password: ")
        if not password:
            print("Password required.")
            return
    except (KeyboardInterrupt, EOFError):
        print("\nLogin cancelled.")
        return

    payload = json.dumps({"email": email, "password": password}).encode()
    req = urllib.request.Request(
        f"{_API_URL}/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("Incorrect email or password.")
        else:
            print(f"Login failed: {e.code}")
        sys.exit(1)
    except urllib.error.URLError:
        print("Cannot reach AutoTest server. Check your connection.")
        sys.exit(1)

    token = data.get("token", "")
    plan = data.get("plan", "free")
    set_token(token, email, plan)
    print(f"\n  Logged in as {email} ({plan.title()} plan)\n")


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
        f"https://auto-test-production-64b6.up.railway.app/auth/me",
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
