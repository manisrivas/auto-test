# AutoTest

**AI-powered unit test generator that runs automatically before every `git push`.**

AutoTest hooks into git, scans only the functions you changed, generates unit tests using AI, runs them, and reports results to your team dashboard — all in seconds.

## Install

```bash
pip install autotest-hook
```

## Quick start

```bash
# 1. Sign up / log in
autotest login

# 2. Install the git hook into your project
cd your-project
autotest --install

# 3. Push as normal — tests run automatically
git push
```

## How it works

```
git push
  → AutoTest scans changed functions
  → AI generates unit tests for each one
  → pytest / jest runs the tests
  → Results posted to your dashboard
  → Push allowed (pass) or blocked (fail)
```

## Commands

```
autotest login          Sign up or log in
autotest --install      Install git pre-push hook
autotest --uninstall    Remove git hook
autotest --run          Run manually (no push needed)
autotest --run --lang js  Run for JavaScript
autotest whoami         Show current account
autotest logout         Log out
```

## Requirements

- Python 3.8+
- git
- pytest (for Python projects) or jest (for JavaScript)

## Plans

| Plan       | Pushes/month | Price  |
|------------|-------------|--------|
| Free       | 50          | $0     |
| Pro        | 500         | $19/mo |
| Enterprise | Unlimited   | Custom |

No API key needed — AI is included in every plan.
