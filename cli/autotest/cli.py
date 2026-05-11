import subprocess
import sys
from typing import List

from .auth import login, logout, whoami
from .config import get_token
from .generator import generate_tests
from .hook import install_hook, uninstall_hook
from .reporter import print_report
from .runner import run_tests
from .scanner import get_changed_functions, get_all_functions
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
    elif "--scan" in args:
        _full_scan(_get_lang(args))
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
    try:
        tests = generate_tests(language, functions)
    except RuntimeError as e:
        print(f"\n  ✖  {e}\n")
        sys.exit(1)
    except Exception:
        print("\n  ⚠  Test generation failed unexpectedly — push allowed through.\n")
        return
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
        print(f"\n  Coverage is {coverage}% — below the 80% quality gate.")
        try:
            answer = input("  Push anyway? [y/N]: ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            answer = "n"
        if answer not in ("y", "yes"):
            print("  Push cancelled. Fix the failing tests and try again.\n")
            sys.exit(1)
        print("  Pushing with low coverage — reported to dashboard.\n")


def _full_scan(language: str) -> None:
    """Full project scan — generates tests for every function, not just changed ones."""
    print(f"\nAutoTest: scanning ALL {language} functions in project...")

    functions = get_all_functions(language)
    if not functions:
        print("No functions found in project.")
        return

    print(f"Found {len(functions)} function(s) across project. Generating tests...")
    print("(This may take a while for large projects — each batch sent to AI)\n")

    batch_size = 10
    all_results = []
    for i in range(0, len(functions), batch_size):
        batch = functions[i:i + batch_size]
        print(f"  Batch {i // batch_size + 1}/{(len(functions) + batch_size - 1) // batch_size} — {len(batch)} functions...")
        try:
            tests = generate_tests(language, batch)
        except RuntimeError as e:
            print(f"\n  ✖  {e}\n")
            sys.exit(1)
        except Exception:
            print("\n  ⚠  Test generation failed — skipping remaining batches.\n")
            break
        if tests:
            results = run_tests(language, tests)
            all_results.extend(results)

    if not all_results:
        print("No tests generated.")
        return

    print_report(all_results)

    send_report(
        language=language,
        results=all_results,
        branch=_git_branch(),
        commit=_git_commit(),
        plan=_detect_plan(),
    )

    total_gen = sum(r.tests_generated for r in all_results)
    total_pass = sum(r.tests_passed for r in all_results)
    coverage = int((total_pass / total_gen * 100) if total_gen > 0 else 0)
    print(f"\nBaseline coverage: {coverage}%")
    if coverage < 80:
        print(f"  Below the 80% quality gate — dashboard will show this as a warning.")


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
  autotest --scan               Full project scan — analyze ALL functions (first time setup)
  autotest --scan --lang js     Full scan for JavaScript / JSX
  autotest --run                Run on changed functions only (used by pre-push hook)
  autotest --run --lang js      Run for JavaScript / JSX
  autotest --run --lang ts      Run for TypeScript / TSX
  autotest logout               Log out
  autotest whoami               Show plan + email
  autotest --help               Show this message

First time? Run:  autotest login
""")
