import os
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from typing import List, Tuple

from .providers.base import GeneratedTest

# Extensions to use when writing temp test files for each language
_TEST_EXT = {
    "python":     ".py",
    "js":         ".js",
    "jsx":        ".jsx",
    "ts":         ".ts",
    "tsx":        ".tsx",
    "javascript": ".js",
    "typescript": ".ts",
}


@dataclass
class RunResult:
    function_name: str
    passed: bool
    output: str
    tests_generated: int
    tests_passed: int


def run_tests(language: str, tests: List[GeneratedTest]) -> List[RunResult]:
    """Run all generated tests. Python uses a temp dir; JS/TS runs from project root."""
    results: List[RunResult] = []
    project_root = os.getcwd()

    if language.lower() == "python":
        with tempfile.TemporaryDirectory() as tmp_dir:
            for test in tests:
                results.append(_run_python(test, tmp_dir))
    else:
        for test in tests:
            results.append(_run_js(test, language, project_root))

    return results


def _run_python(test: GeneratedTest, tmp_dir: str) -> RunResult:
    test_file = os.path.join(tmp_dir, f"test_{test.name}.py")
    with open(test_file, "w", encoding="utf-8") as f:
        f.write(_strip_markdown(test.test_code))

    env = os.environ.copy()
    project_root = os.getcwd()
    existing_path = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = f"{project_root}{os.pathsep}{existing_path}" if existing_path else project_root

    # Use sys.executable so we always match the Python that's running the CLI
    proc = subprocess.run(
        [sys.executable, "-m", "pytest", test_file, "-v", "--tb=short"],
        capture_output=True, text=True, timeout=60, cwd=tmp_dir, env=env,
    )
    passed, total = _parse_pytest(proc.stdout)
    return RunResult(
        function_name=test.name, passed=proc.returncode == 0,
        output=proc.stdout + proc.stderr,
        tests_generated=total, tests_passed=passed,
    )


def _run_js(test: GeneratedTest, language: str, project_root: str) -> RunResult:
    """
    Write the test file into a temp dir but run Jest from the project root so
    it picks up the project's jest.config, tsconfig, babel.config, and node_modules.
    """
    ext = _TEST_EXT.get(language.lower(), ".js")
    safe_name = re.sub(r"\W+", "_", test.name)

    with tempfile.NamedTemporaryFile(
        suffix=f".test{ext}",
        prefix=f"autotest_{safe_name}_",
        dir=project_root,
        delete=False,
        mode="w",
        encoding="utf-8",
    ) as f:
        f.write(_strip_markdown(test.test_code))
        tmp_path = f.name

    try:
        # Use npx so jest doesn't need to be on PATH globally
        cmd = ["npx", "--yes", "jest", tmp_path, "--no-coverage", "--forceExit", "--passWithNoTests"]

        # For TypeScript projects, add ts-jest preset only if no jest config exists
        if ext in (".ts", ".tsx") and not _has_jest_config(project_root):
            cmd += ["--preset", "ts-jest"]

        proc = subprocess.run(
            cmd,
            capture_output=True, text=True, timeout=60, cwd=project_root,
        )
        passed, total = _parse_jest(proc.stdout + proc.stderr)
        return RunResult(
            function_name=test.name, passed=proc.returncode == 0,
            output=proc.stdout + proc.stderr,
            tests_generated=total, tests_passed=passed,
        )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def _has_jest_config(directory: str) -> bool:
    for name in ("jest.config.js", "jest.config.ts", "jest.config.mjs", "jest.config.cjs"):
        if os.path.exists(os.path.join(directory, name)):
            return True
    # Also check package.json for "jest" key
    pkg = os.path.join(directory, "package.json")
    if os.path.exists(pkg):
        try:
            import json
            with open(pkg, encoding="utf-8") as f:
                data = json.load(f)
            if "jest" in data:
                return True
        except (OSError, ValueError):
            pass
    return False


def _command_exists(cmd: str) -> bool:
    try:
        subprocess.run([cmd, "--version"], capture_output=True, timeout=5)
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def _parse_pytest(output: str) -> Tuple[int, int]:
    passed = len(re.findall(r" PASSED", output))
    failed = len(re.findall(r" FAILED", output))
    total = passed + failed
    # Fallback: summary line "3 passed, 1 failed"
    if total == 0:
        m = re.search(r"(\d+) passed", output)
        if m:
            passed = int(m.group(1))
        m2 = re.search(r"(\d+) failed", output)
        if m2:
            failed = int(m2.group(1))
        total = passed + failed
    return passed, max(total, 1) if passed or failed else 0


def _strip_markdown(code: str) -> str:
    """Remove ```python ... ``` or ``` ... ``` wrappers AI models sometimes add."""
    code = code.strip()
    code = re.sub(r"^```[a-zA-Z]*\n?", "", code)
    code = re.sub(r"\n?```$", "", code)
    return code.strip()


def _parse_jest(output: str) -> Tuple[int, int]:
    # "Tests: 2 passed, 3 total" or "Tests: 3 passed"
    m = re.search(r"Tests:\s+(?:\d+ \w+,\s+)*?(\d+) passed(?:,\s+(\d+) total)?", output)
    if m:
        passed = int(m.group(1))
        total = int(m.group(2)) if m.group(2) else passed
        return passed, total
    # Fallback: count ✓ and ✕ symbols
    passed = len(re.findall(r"✓|✔|√|PASS", output))
    failed = len(re.findall(r"✕|✗|×|FAIL", output))
    return passed, passed + failed
