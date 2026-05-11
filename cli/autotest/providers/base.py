from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List


@dataclass
class FunctionInfo:
    name: str
    file: str
    code: str
    line: int = 0


@dataclass
class GeneratedTest:
    name: str
    test_code: str


class BaseProvider(ABC):
    """Abstract base for all AI providers."""

    @abstractmethod
    def generate_tests(self, language: str, functions: List[FunctionInfo]) -> List[GeneratedTest]:
        """Generate unit tests for the given functions."""
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if this provider is configured and reachable."""
        ...
