import ast
import re
import subprocess
from typing import List

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
