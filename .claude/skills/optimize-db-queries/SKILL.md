---
name: optimize-db-queries
description: Analyze and optimize PostgreSQL + PostGIS database queries for performance. Use when investigating slow queries, optimizing spatial joins, improving index strategy, or tuning database performance for Chilean real estate data.
context: fork
agent: database-manager-agent
allowed-tools: Read, Grep, Glob, Bash(npx prisma *)
disable-model-invocation: false
---

# Optimize Database Queries

Analyze and optimize slow database queries in the inmogrid.cl project.

## Analysis Steps

1. **Identify Slow Queries**: Scan Prisma queries and raw SQL in `src/app/api/` routes, focusing on N+1 patterns, missing includes, and unoptimized filters
2. **PostGIS Spatial Optimization**: Review spatial queries (ST_Within, ST_DWithin, ST_Intersects), check for GIST/SP-GIST index usage on geometry columns
3. **Query Plan Analysis**: Suggest `EXPLAIN ANALYZE` for critical queries, identify sequential scans on large tables
4. **Index Strategy**: Evaluate indexes for Chilean property identifiers (ROL, commune, region), composite indexes for common filter combinations
5. **Prisma ORM Patterns**: Check for `findMany` without pagination, missing `select` clauses loading unnecessary fields, raw query opportunities for complex spatial operations
6. **Aggregation Optimization**: Review statistics module queries, market data aggregations, and chart data endpoints

## Safety Requirements

- **Never modify production data** - analysis only, recommend changes
- Preserve existing RLS policies
- Validate data integrity after any suggested schema changes
- Provide rollback procedures for index changes

## Output

- Performance benchmarks (before/after estimates)
- Specific query rewrites with explanations
- Index creation statements
- Prisma schema optimization suggestions
