import sys
from typing import List

from .providers.base import FunctionInfo, GeneratedTest
from .providers.autotest_backend import AutotestBackendProvider
from .config import get_token


def generate_tests(language: str, functions: List[FunctionInfo]) -> List[GeneratedTest]:
    """Generate tests via AutoTest backend. Requires login."""
    if not functions:
        return []

    token = get_token()
    if not token:
        print("\n  Not logged in.")
        print("  Run: autotest login\n")
        print("  Sign up free at https://autotest.dev")
        sys.exit(1)

    return AutotestBackendProvider(token).generate_tests(language, functions)
