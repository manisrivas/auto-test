from typing import List

from .runner import RunResult


def print_report(results: List[RunResult]) -> None:
    """Print a formatted terminal summary of test run results."""
    if not results:
        print("\nNo functions were tested.")
        return

    total_gen = sum(r.tests_generated for r in results)
    total_pass = sum(r.tests_passed for r in results)
    coverage = int((total_pass / total_gen * 100) if total_gen > 0 else 0)

    print("\n" + "=" * 52)
    print("  AutoTest Report")
    print("=" * 52)

    for r in results:
        icon = "PASS" if r.passed else "FAIL"
        print(f"\n  [{icon}]  {r.function_name}")
        print(f"         Tests: {r.tests_passed}/{r.tests_generated} passed")
        if not r.passed:
            _print_failure_snippet(r.output)

    print("\n" + "-" * 52)
    print(f"  Functions tested : {len(results)}")
    print(f"  Tests generated  : {total_gen}")
    print(f"  Tests passed     : {total_pass}")
    print(f"  Tests failed     : {total_gen - total_pass}")
    print(f"  Coverage score   : {coverage}%")

    threshold = 80
    if coverage >= threshold:
        print(f"\n  Quality gate PASSED ({coverage}% >= {threshold}%)")
    else:
        print(f"\n  Quality gate FAILED ({coverage}% < {threshold}%)")
    print("=" * 52 + "\n")


def _print_failure_snippet(output: str) -> None:
    """Show the first few relevant lines from a failure output."""
    relevant = [
        line.strip() for line in output.split("\n")
        if any(kw in line for kw in ("FAILED", "Error", "assert", "AssertionError"))
    ]
    for line in relevant[:4]:
        print(f"           {line}")
