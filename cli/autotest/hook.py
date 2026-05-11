import subprocess
import sys
from pathlib import Path

_HOOK_SCRIPT = """#!/bin/sh
# AutoTest pre-push hook — auto-generated, do not edit manually
autotest --run
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "  AutoTest: tests failed. Fix them or use 'git push --no-verify' to skip."
    echo ""
    exit 1
fi
exit 0
"""


def install_hook() -> None:
    """Install the AutoTest pre-push hook in the current git repository."""
    git_dir = _find_git_dir()
    if git_dir is None:
        print("Error: Not inside a git repository.")
        sys.exit(1)

    hooks_dir = git_dir / "hooks"
    hooks_dir.mkdir(exist_ok=True)
    hook_path = hooks_dir / "pre-push"

    if hook_path.exists():
        print(f"A pre-push hook already exists at {hook_path}")
        try:
            answer = input("Overwrite? [y/N]: ").strip().lower()
        except (KeyboardInterrupt, EOFError):
            print("\nCancelled.")
            return
        if answer != "y":
            print("Hook installation cancelled.")
            return

    hook_path.write_text(_HOOK_SCRIPT, encoding="utf-8")
    try:
        hook_path.chmod(0o755)
    except OSError:
        pass
    print(f"  pre-push hook installed at {hook_path}")


def uninstall_hook() -> None:
    """Remove the AutoTest pre-push hook."""
    git_dir = _find_git_dir()
    if git_dir is None:
        print("Error: Not inside a git repository.")
        sys.exit(1)

    hook_path = git_dir / "hooks" / "pre-push"
    if not hook_path.exists():
        print("No pre-push hook found.")
        return

    hook_path.unlink()
    print("  pre-push hook removed.")


def _find_git_dir() -> "Path | None":
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            return Path(result.stdout.strip())
        return None
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None
