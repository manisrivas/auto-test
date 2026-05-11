import subprocess
import sys
from typing import List

from .auth import login, logout, whoami
from .config import get_token
from .generator import generate_tests
from .hook import install_hook, uninstall_hook
from .reporter import print_report
from .runner import run_tests
from .scanner import get_changed_functions
from .sender import send_report


def main() -> None:
    """CLI entry point for the autotest command."""
    args = sys.argv[1:]

    if not args or "--help" in args or "-h" in args:
        _print_help()
        return

    if "--install" in args:
        install_hook()
    elif "--uninstall" in args:
        uninstall_hook()
    elif "--run" in args:
        _run(_get_lang(args))
    elif args[0] == "login":
        login()
    elif args[0] == "logout":
        logout()
    elif args[0] == "whoami":
        whoami()
    else:
        print(f"Unknown command: {' '.join(args)}")
        _print_help()
        sys.exit(1)


def _run(language: str) -> None:
    """Core flow: scan → generate → run → report → send."""
    print(f"\nAutoTest: scanning changed {language} functions...")

    functions = get_changed_functions(language)
    if not functions:
        print("No changed functions found — skipping test generation.")
        return

    print(f"Found {len(functions)} function(s). Generating tests...")
    tests = generate_tests(language, functions)
    if not tests:
        print("No tests generated — allowing push.")
        return

    print(f"Running {len(tests)} test suite(s)...")
    results = run_tests(language, tests)

    print_report(results)

    send_report(
        language=language,
        results=results,
        branch=_git_branch(),
        commit=_git_commit(),
        plan=_detect_plan(),
    )

    total_gen = sum(r.tests_generated for r in results)
    total_pass = sum(r.tests_passed for r in results)
    coverage = int((total_pass / total_gen * 100) if total_gen > 0 else 0)
    if coverage < 80:
        sys.exit(1)


def _get_lang(args: List[str]) -> str:
    valid = {"python", "js", "jsx", "ts", "tsx", "javascript", "typescript"}
    if "--lang" in args:
        idx = args.index("--lang")
        if idx + 1 < len(args):
            lang = args[idx + 1].lower()
            if lang not in valid:
                print(f"Unknown language '{lang}'. Valid options: {', '.join(sorted(valid))}")
                sys.exit(1)
            return lang
    return "python"


def _detect_plan() -> str:
    from .auth import _verify_token
    token = get_token()
    if token:
        info = _verify_token(token)
        if info:
            return info.get("plan", "free")
    return "free"


def _git_branch() -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
        return r.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return "unknown"


def _git_commit() -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
        return r.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return "unknown"


def _print_help() -> None:
    print("""
AutoTest — AI-Powered Pre-Push Test Generator

Usage:
  autotest login                Sign up / log in
  autotest --install            Install git pre-push hook
  autotest --uninstall          Remove git pre-push hook
  autotest --run                Run test generation manually (default: python)
  autotest --run --lang js      Run for JavaScript / JSX
  autotest --run --lang ts      Run for TypeScript / TSX
  autotest logout               Log out
  autotest whoami               Show plan + email
  autotest --help               Show this message

First time? Run:  autotest login
""")
