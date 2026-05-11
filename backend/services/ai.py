"""
AI provider abstraction for the AutoTest backend.

Priority when no enterprise key is given:
  1. ANTHROPIC_API_KEY  → Claude (claude-sonnet-4-6)
  2. OPENAI_API_KEY     → GPT-4o
  3. GEMINI_API_KEY     → Gemini 1.5 Flash

Enterprise users always send their own Anthropic key (stored encrypted in DB).
"""

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any

_SEPARATOR = "=== FUNCTION: "


# ---------------------------------------------------------------------------
# Provider detection
# ---------------------------------------------------------------------------

def _active_provider() -> str:
    """Return which backend AI provider is configured."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    if os.environ.get("GEMINI_API_KEY"):
        return "gemini"
    raise RuntimeError(
        "No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY."
    )


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def generate_tests_for_functions(
    language: str,
    functions: list[dict[str, str]],
    enterprise_api_key: str | None = None,
) -> list[dict[str, str]]:
    """One AI call for all functions in a push. Uses our key, or enterprise Anthropic key."""
    if not functions:
        return []

    prompt = _build_prompt(language, functions)

    if enterprise_api_key:
        raw = _call_anthropic(enterprise_api_key, prompt)
    else:
        provider = _active_provider()
        if provider == "anthropic":
            raw = _call_anthropic(os.environ["ANTHROPIC_API_KEY"], prompt)
        elif provider == "openai":
            raw = _call_openai(os.environ["OPENAI_API_KEY"], prompt)
        else:
            raw = _call_gemini(os.environ["GEMINI_API_KEY"], prompt)

    return _parse_batch_response(raw, functions)


def get_ai_suggestions(project_data: dict[str, Any]) -> list[str]:
    """Return AI improvement suggestions for a project's coverage data."""
    prompt = (
        "You are a code quality advisor. Based on the following project coverage data, "
        "suggest 3-5 specific, actionable improvements. Be concise, one sentence each.\n\n"
        f"Project: {project_data.get('name')}\n"
        f"Coverage: {project_data.get('coverage_percent')}%\n"
        f"Low coverage files: {project_data.get('low_coverage_files', [])}\n"
    )

    provider = _active_provider()
    if provider == "anthropic":
        raw = _call_anthropic(os.environ["ANTHROPIC_API_KEY"], prompt, max_tokens=512)
    elif provider == "openai":
        raw = _call_openai(os.environ["OPENAI_API_KEY"], prompt, max_tokens=512)
    else:
        raw = _call_gemini(os.environ["GEMINI_API_KEY"], prompt, max_tokens=512)

    return [line.strip("- •").strip() for line in raw.strip().split("\n") if line.strip()]


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_prompt(language: str, functions: list[dict[str, str]]) -> str:
    functions_text = "\n\n".join(
        f"{_SEPARATOR}{f['name']} ===\nFile: {f['file']}\n```{language}\n{f['code']}\n```"
        for f in functions
    )
    return (
        f"Generate unit tests for each of the following {language} functions.\n"
        f"For EACH function output its tests using this EXACT format:\n\n"
        f"{_SEPARATOR}<function_name> ===\n<test code only, no explanations>\n\n"
        f"Use that separator before every function's tests. Here are the functions:\n\n"
        f"{functions_text}"
    )


# ---------------------------------------------------------------------------
# Anthropic (Claude)
# ---------------------------------------------------------------------------

def _call_anthropic(api_key: str, prompt: str, max_tokens: int = 4096) -> str:
    payload = json.dumps({
        "model": "claude-sonnet-4-6",
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    return data["content"][0]["text"]


# ---------------------------------------------------------------------------
# OpenAI (GPT-4o)
# ---------------------------------------------------------------------------

def _call_openai(api_key: str, prompt: str, max_tokens: int = 4096) -> str:
    payload = json.dumps({
        "model": "gpt-4o",
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# Google Gemini (1.5 Flash)
# ---------------------------------------------------------------------------

def _call_gemini(api_key: str, prompt: str, max_tokens: int = 4096) -> str:
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": max_tokens},
    }).encode()

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={api_key}"
    )
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    return data["candidates"][0]["content"]["parts"][0]["text"]


# ---------------------------------------------------------------------------
# Response parser
# ---------------------------------------------------------------------------

def _parse_batch_response(raw: str, functions: list[dict[str, str]]) -> list[dict[str, str]]:
    """Split the AI batch response back into per-function test code."""
    sections = re.split(r"=== FUNCTION: (.+?) ===", raw)
    pairs = list(zip(sections[1::2], sections[2::2]))
    matched: dict[str, str] = {name.strip(): code.strip() for name, code in pairs}

    results: list[dict[str, str]] = []
    for func in functions:
        name = func["name"]
        test_code = matched.get(name, f"# AutoTest: could not parse tests for {name}")
        results.append({"name": name, "test_code": test_code})
    return results
