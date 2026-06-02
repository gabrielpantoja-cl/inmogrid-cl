---
name: fix-issue
description: Fix a GitHub issue described by the user (paste URL or number). Reads the issue, locates the affected code, implements a minimal fix, verifies build/lint, and presents the diff for review without committing.
---

# Fix GitHub Issue

Fix the GitHub issue described below. Argument: $ARGUMENTS (issue URL, number, or description).

## Steps

1. **Read the issue**: if `$ARGUMENTS` is a URL or `#NNN`, fetch with `gh issue view NNN`. If it's free-text, treat it as the description directly.
2. **Understand the affected code**: read the relevant files BEFORE changing anything. Use `Grep`/`Explore` agent if scope is unclear. Don't speculate — read the actual implementation.
3. **Plan the fix**: state in 1-2 sentences what you're going to change and why. If the fix touches multiple files or has architectural implications, propose a Plan via `EnterPlanMode` before coding.
4. **Implement minimally**: no unrelated refactoring, no "while I'm here" cleanup. The fix is the fix.
5. **Verify**:
   - `npm run build` — must pass.
   - `npm run lint` — must pass (or at least: no new warnings introduced).
   - If tests exist for the affected area: `npm run test -- <pattern>`.
6. **Show the diff**: `git diff` and propose a Conventional Commit message (`fix:`, `feat:`, `refactor:`, etc., see existing messages with `git log --oneline -20`).
7. **Do NOT commit or push** unless the user explicitly asks. Present for review.

## Anti-patterns to refuse

- "Just suppress the error with `as any`" → no, fix the type or document the cast with a comment.
- "Add a try/catch and log" → unhelpful unless the underlying cause is understood. Fix the cause.
- Bypassing pre-commit hooks (`--no-verify`) — see `settings.json` hooks; if a hook blocks you, fix the underlying issue first.
- Touching files unrelated to the issue scope.
