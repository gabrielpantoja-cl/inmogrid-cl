---
name: security-scan
description: Comprehensive security audit for OWASP compliance and Chilean data protection (Ley 19.628). Use when reviewing security vulnerabilities, checking for injection attacks, auditing API endpoints, or verifying data protection compliance.
context: fork
agent: security-auditor-agent
allowed-tools: Read, Grep, Glob, Bash(npm audit *), Bash(npx *)
disable-model-invocation: false
---

# Security Scan

Perform a comprehensive security audit of the inmogrid.cl codebase, database configurations, and API endpoints.

## Audit Scope

1. **OWASP Top 10**: Check for SQL injection, XSS, CSRF, insecure deserialization, broken authentication, security misconfigurations, sensitive data exposure
2. **Authentication & Authorization**: Review NextAuth.js configuration, JWT handling, session management, middleware route protection
3. **API Security**: Validate input sanitization on all endpoints, CORS configuration, rate limiting, public vs private API isolation
4. **Database Security**: Review RLS policies, connection strings, exposed credentials, PostGIS access controls
5. **CSP Headers**: Check `next.config.js` for unsafe directives (`unsafe-eval`, `unsafe-inline`)
6. **Dependencies**: Run `npm audit` and flag known CVEs
7. **Chilean Data Protection**: Verify compliance with Ley 19.628, ensure personal data is not exposed in public API responses
8. **Infrastructure**: Check Dockerfile, Docker Compose configs, exposed ports, and environment variable handling

## Output Format

- Vulnerability report with CVSS scores
- Risk prioritization (Critical > High > Medium > Low)
- Specific remediation steps for each finding
- Compliance gap analysis for Chilean data protection
