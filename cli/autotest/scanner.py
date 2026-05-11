import ast
import os
import re
import subprocess
from typing import Any, Dict, List

from .providers.base import FunctionInfo

# Map language names to file extensions
_LANG_EXTS = {
    "python": {".py"},
    "js":     {".js", ".jsx"},
    "jsx":    {".js", ".jsx"},
    "ts":     {".ts", ".tsx"},
    "tsx":    {".ts", ".tsx"},
    "javascript": {".js", ".jsx"},
    "typescript": {".ts", ".tsx"},
}


def get_all_functions(language: str, root: str = ".") -> List[FunctionInfo]:
    """Return all functions in the project directory (for initial full scan)."""
    import os
    exts = _LANG_EXTS.get(language.lower(), {".py"})
    functions: List[FunctionInfo] = []
    skip_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", ".next", "dist", "build"}

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        for fname in filenames:
            if any(fname.endswith(ext) for ext in exts):
                full_path = os.path.join(dirpath, fname)
                functions.extend(_extract_functions(full_path, language))

    return functions


def get_changed_functions(language: str) -> List[FunctionInfo]:
    """Return functions from files changed in the most recent push."""
    diff = _get_git_diff()
    if not diff:
        return []

    exts = _LANG_EXTS.get(language.lower(), {".py"})
    changed_files = _parse_changed_files(diff, exts)
    functions: List[FunctionInfo] = []

    for file_path in changed_files:
        functions.extend(_extract_functions(file_path, language))

    return functions


def _get_git_diff() -> str:
    """Try several strategies to get a useful diff for the current push."""
    strategies = [
        ["git", "diff", "HEAD~1", "HEAD"],   # best: between last two commits
        ["git", "diff", "--cached"],          # staged changes
        ["git", "diff", "HEAD"],             # unstaged vs HEAD
    ]
    for cmd in strategies:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.stdout.strip():
                return result.stdout
        except (subprocess.TimeoutExpired, FileNotFoundError):
            continue
    return ""


def _parse_changed_files(diff: str, exts: set) -> List[str]:
    files: List[str] = []
    for line in diff.split("\n"):
        if not line.startswith("+++ b/"):
            continue
        path = line[6:]
        if any(path.endswith(ext) for ext in exts):
            files.append(path)
    return files


def _extract_functions(file_path: str, language: str) -> List[FunctionInfo]:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            source = f.read()
    except (OSError, UnicodeDecodeError):
        return []

    if language.lower() in ("python",):
        return _extract_python_functions(file_path, source)
    return _extract_js_functions(file_path, source)


def _extract_python_functions(file_path: str, source: str) -> List[FunctionInfo]:
    """Use the AST module for reliable Python function extraction."""
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []

    lines = source.splitlines()
    functions: List[FunctionInfo] = []

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        # Skip private/dunder helpers that are noise
        start = node.lineno - 1
        # end_lineno available in Python 3.8+
        end = getattr(node, "end_lineno", start + 20)
        code = "\n".join(lines[start:end])
        functions.append(FunctionInfo(
            name=node.name,
            file=file_path,
            code=code,
            line=node.lineno,
        ))

    return functions


def _extract_js_functions(file_path: str, source: str) -> List[FunctionInfo]:
    """
    Extract JS/TS/JSX/TSX functions using a regex + brace-matching approach
    so nested braces don't truncate function bodies.
    """
    # Match the start of a function declaration or arrow function
    head_pattern = re.compile(
        r"""
        (?:export\s+(?:default\s+)?)?          # optional export
        (?:async\s+)?                           # optional async
        (?:
            function\s+(\w+)\s*\([^)]*\)        # function name(...)
            |
            (?:const|let|var)\s+(\w+)\s*=\s*    # const name =
            (?:async\s+)?
            (?:\([^)]*\)|(\w+))\s*=>            # (...) => or x =>
        )
        \s*                                     # optional whitespace
        \{                                      # opening brace — body starts here
        """,
        re.VERBOSE | re.MULTILINE,
    )

    functions: List[FunctionInfo] = []

    for m in head_pattern.finditer(source):
        name = m.group(1) or m.group(2)
        if not name:
            continue

        brace_start = m.end() - 1   # position of '{'
        body_end = _find_closing_brace(source, brace_start)
        if body_end == -1:
            continue

        code = source[m.start():body_end + 1].strip()
        line_num = source[:m.start()].count("\n") + 1
        functions.append(FunctionInfo(name=name, file=file_path, code=code, line=line_num))

    return functions


def scan_quality_issues(language: str, root: str = ".") -> List[Dict[str, Any]]:
    """Static analysis: production issues, dead code, stale files. Zero AI, pure regex/git."""
    exts = _LANG_EXTS.get(language.lower(), {".py"})
    skip_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", ".next", "dist", "build"}
    all_files: List[str] = []

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]
        for fname in filenames:
            if any(fname.endswith(ext) for ext in exts):
                all_files.append(os.path.join(dirpath, fname))

    if not all_files:
        return []

    sources: Dict[str, str] = {}
    for fp in all_files:
        try:
            with open(fp, "r", encoding="utf-8") as f:
                sources[fp] = f.read()
        except (OSError, UnicodeDecodeError):
            pass

    combined = "\n".join(sources.values())
    issues: List[Dict[str, Any]] = []

    for fp, src in sources.items():
        issues.extend(_check_production_issues(fp, src, language))
        issues.extend(_check_dead_functions(fp, src, language, combined))

    issues.extend(_check_stale_files(list(sources.keys())))
    return issues


def _is_test_file(file_path: str) -> bool:
    name = os.path.basename(file_path).lower()
    return "test" in name or "spec" in name


def _check_production_issues(file_path: str, source: str, language: str) -> List[Dict[str, Any]]:
    """Flag print/console.log, debugger calls, TODO comments, hardcoded secrets."""
    if _is_test_file(file_path):
        return []

    issues: List[Dict[str, Any]] = []
    is_python = language.lower() == "python"

    for i, raw_line in enumerate(source.splitlines(), 1):
        line = raw_line.strip()

        if is_python and re.match(r'^print\s*\(', line):
            issues.append({"type": "production_issue", "severity": "warning",
                           "file": file_path, "line": i,
                           "message": "print() statement in production code",
                           "snippet": line[:80]})

        if not is_python and re.match(r'^console\.(log|warn|error|debug)\s*\(', line):
            issues.append({"type": "production_issue", "severity": "warning",
                           "file": file_path, "line": i,
                           "message": "console.log() statement in production code",
                           "snippet": line[:80]})

        if is_python and re.search(r'\b(pdb\.set_trace\(\)|breakpoint\(\))', line):
            issues.append({"type": "production_issue", "severity": "error",
                           "file": file_path, "line": i,
                           "message": "Debugger breakpoint left in code",
                           "snippet": line[:80]})

        if not is_python and re.search(r'\bdebugger\b', line):
            issues.append({"type": "production_issue", "severity": "error",
                           "file": file_path, "line": i,
                           "message": "debugger statement in production code",
                           "snippet": line[:80]})

        if re.search(r'#\s*(TODO|FIXME|HACK|XXX)\b', line) or re.search(r'//\s*(TODO|FIXME|HACK|XXX)\b', line):
            issues.append({"type": "production_issue", "severity": "warning",
                           "file": file_path, "line": i,
                           "message": f"Unresolved comment: {line[:60]}",
                           "snippet": line[:80]})

        if re.search(r'(?i)(password|secret|api_key|apikey|auth_token)\s*=\s*["\'][^"\']{6,}["\']', line):
            safe = re.sub(r'=\s*(["\']).*?\1', '= "***"', line)
            issues.append({"type": "production_issue", "severity": "error",
                           "file": file_path, "line": i,
                           "message": "Possible hardcoded secret or credential",
                           "snippet": safe[:80]})

    return issues


def _check_dead_functions(
    file_path: str, source: str, language: str, combined: str
) -> List[Dict[str, Any]]:
    """Flag Python functions that appear to have no callers across the whole project."""
    if _is_test_file(file_path) or language.lower() != "python":
        return []

    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []

    issues: List[Dict[str, Any]] = []
    skip_names = {"main", "app", "create_app", "setup", "teardown", "handler", "lambda_handler"}

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        name = node.name
        if name.startswith("_") or name in skip_names:
            continue
        # Count calls: `name(` anywhere in combined source
        call_matches = len(re.findall(r'\b' + re.escape(name) + r'\s*\(', combined))
        # The def line itself contributes 0 (it's `def name(`, not `name(`)
        if call_matches == 0:
            issues.append({"type": "dead_code", "severity": "warning",
                           "file": file_path, "line": node.lineno,
                           "message": f"Function '{name}' has no callers in the project",
                           "snippet": f"def {name}(...)"})

    return issues


def _check_stale_files(all_files: List[str]) -> List[Dict[str, Any]]:
    """Flag files with no git commits in the last 90 days."""
    import datetime
    issues: List[Dict[str, Any]] = []
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=90)

    for fp in all_files:
        if _is_test_file(fp):
            continue
        last_mod = _git_file_last_modified(fp)
        if last_mod and last_mod < cutoff:
            days = (datetime.datetime.now(datetime.timezone.utc) - last_mod).days
            issues.append({"type": "stale_code", "severity": "warning",
                           "file": fp, "line": 0,
                           "message": f"No commits in {days} days — may be stale or dead",
                           "snippet": ""})

    return issues


def _git_file_last_modified(file_path: str) -> "Any":
    import datetime
    try:
        r = subprocess.run(
            ["git", "log", "-1", "--format=%aI", "--", file_path],
            capture_output=True, text=True, timeout=5,
        )
        date_str = r.stdout.strip()
        if not date_str:
            return None
        return datetime.datetime.fromisoformat(date_str)
    except Exception:
        return None


def _find_closing_brace(source: str, open_pos: int) -> int:
    """Return the index of the closing '}' that matches the '{' at open_pos."""
    depth = 0
    in_string: str = ""
    i = open_pos
    while i < len(source):
        ch = source[i]
        if in_string:
            if ch == "\\" and in_string != "`":
                i += 2
                continue
            if ch == in_string:
                in_string = ""
        else:
            if ch in ("'", '"', "`"):
                in_string = ch
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return -1
