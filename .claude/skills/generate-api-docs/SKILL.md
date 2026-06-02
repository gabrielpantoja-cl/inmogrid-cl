---
name: generate-api-docs
description: Generate OpenAPI 3.0 documentation for inmogrid.cl API endpoints. Use when creating API docs, updating endpoint documentation, or generating Swagger specs for public and private APIs.
context: fork
agent: api-developer-agent
allowed-tools: Read, Grep, Glob, Write, Edit
disable-model-invocation: false
---

# Generate API Documentation

Generate up-to-date OpenAPI 3.0 documentation for all existing API endpoints in inmogrid.cl.

## Scope

Scan and document all routes under `src/app/api/`:

### Public API (`/api/public/`)
- `map-data/` - Geospatial real estate data
- `map-config/` - API metadata and configuration
- `health/` - System health checks
- `docs/` - Interactive API documentation

### Private API (authenticated)
- `users/profile` - GET/PUT current user profile
- `users/[userId]` - GET public profile
- `properties/` - GET/POST properties CRUD
- `properties/[id]` - GET/PUT/DELETE single property
- `connections/` - GET connections, POST request, PUT/DELETE manage

## Requirements

1. **OpenAPI 3.0** compliant specification
2. Include **Chilean-specific examples** (ROL, fojas, commune names, CLP currency)
3. Document all request/response schemas with Zod validation details
4. Document authentication flows (Google OAuth via NextAuth)
5. Include error response schemas (400, 401, 403, 404, 500)
6. Document rate limiting and CORS policies
7. Separate public vs private endpoint sections

## Output Files

- `docs/api/openapi.json` - OpenAPI specification
- `docs/api/README.md` - Quick start integration guide
