import json
import os
import urllib.request
import urllib.error
from typing import List

from .base import BaseProvider, FunctionInfo, GeneratedTest


class AutotestBackendProvider(BaseProvider):
    """Pro/Enterprise plan — calls our backend which uses our Anthropic key."""

    DEFAULT_API_URL = "https://autotest-backend-production.up.railway.app"

    def __init__(self, token: str) -> None:
        self.token = token
        self.api_url: str = os.environ.get("AUTOTEST_API_URL", self.DEFAULT_API_URL)

    def is_available(self) -> bool:
        return bool(self.token)

    def generate_tests(self, language: str, functions: List[FunctionInfo]) -> List[GeneratedTest]:
        payload = json.dumps({
            "language": language,
            "functions": [{"name": f.name, "file": f.file, "code": f.code} for f in functions],
        }).encode()

        req = urllib.request.Request(
            f"{self.api_url}/generate-tests",
            data=payload,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read())
                return [
                    GeneratedTest(name=item["name"], test_code=item["test_code"])
                    for item in data["generated"]
                ]
        except urllib.error.HTTPError as e:
            self._handle_http_error(e)
            return []
        except (urllib.error.URLError, TimeoutError):
            print("\n  Warning: AutoTest backend unreachable — skipping test generation.")
            return []

    def _handle_http_error(self, e: urllib.error.HTTPError) -> None:
        if e.code == 401:
            raise RuntimeError("Session expired — run: autotest login")
        if e.code == 403:
            raise RuntimeError("Free plan detected — set an API key or run: autotest login")
        if e.code == 429:
            raise RuntimeError("Monthly usage limit reached — upgrade your plan at autotest.dev")
        body = e.read().decode()
        raise RuntimeError(f"Backend error {e.code}: {body}")
