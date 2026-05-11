import json
import os
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Any, Dict, List

from .runner import RunResult
from .config import get_token, get_user_info

_API_URL = os.environ.get("AUTOTEST_API_URL", "https://auto-test-production-64b6.up.railway.app")


def send_report(
    language: str,
    results: List[RunResult],
    branch: str,
    commit: str,
    plan: str,
    quality_checks: List[Dict[str, Any]] = [],
) -> None:
    """POST results to the dashboard API. Never blocks push on failure."""
    project_key = os.environ.get("AUTOTEST_PROJECT_KEY")
    if not project_key:
        return

    payload = _build_payload(language, results, branch, commit, plan, quality_checks)
    token = get_token()

    headers: dict = {
        "Content-Type": "application/json",
        "X-Project-Key": project_key,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    _post_silent(f"{_API_URL}/report", payload, headers)


def _build_payload(
    language: str,
    results: List[RunResult],
    branch: str,
    commit: str,
    plan: str,
    quality_checks: List[Dict[str, Any]],
) -> bytes:
    user_info = get_user_info()
    total_gen = sum(r.tests_generated for r in results)
    total_pass = sum(r.tests_passed for r in results)
    coverage = int((total_pass / total_gen * 100) if total_gen > 0 else 0)

    return json.dumps({
        "branch": branch,
        "commit": commit,
        "developer": user_info.get("email", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "language": language,
        "plan": plan,
        "summary": {
            "functions_scanned": len(results),
            "tests_generated": total_gen,
            "tests_passed": total_pass,
            "tests_failed": total_gen - total_pass,
            "coverage_percent": coverage,
        },
        "functions": [
            {
                "name": r.function_name,
                "file": "",
                "line": 0,
                "status": "passed" if r.passed else "failed",
                "tests_generated": r.tests_generated,
                "tests_passed": r.tests_passed,
                "failure_output": r.output if not r.passed else None,
            }
            for r in results
        ],
        "quality_checks": quality_checks,
    }).encode()


def _post_silent(url: str, payload: bytes, headers: dict) -> None:
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5):
            pass
    except (urllib.error.URLError, OSError):
        pass  # Fail open — network issues must never block a push
