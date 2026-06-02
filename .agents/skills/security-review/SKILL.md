---
name: security-review
description: Quick security review of recent code changes. Use before merging PRs or deploying to check for common vulnerabilities, secret leaks, and auth bypass issues.
context: fork
agent: security-auditor-agent
allowed-tools: Read, Grep, Glob, Bash(git diff *), Bash(git log *)
disable-model-invocation: false
---

# Security Review

Review recent code changes for security issues before merge/deploy.

## Steps

1. **Diff analysis**: Get the current diff (`git diff` or `git diff main...HEAD`)
2. **Secret detection**: Scan for hardcoded credentials, API keys, tokens, connection strings
3. **Injection vectors**: Check for `dangerouslySetInnerHTML`, `$queryRaw`, `eval()`, `execSync`, unsanitized user input
4. **Auth bypass**: Verify all new API routes have proper auth checks (getUser/requireAuth)
5. **Data exposure**: Ensure no RUT, personal data, or internal IDs leak in public endpoints
6. **Dependency check**: If `package.json` changed, run `npm audit --json` and flag critical/high CVEs

## Output

- PASS/FAIL verdict with specific findings
- One-line remediation per finding
- Block deploy recommendation if Critical issues found
