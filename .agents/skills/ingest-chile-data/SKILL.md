---
name: ingest-chile-data
description: Ingest and validate Chilean real estate transaction data from CBR sources. Use when processing CSV/JSON property data files, importing bulk real estate records, or validating Chilean property identifiers (ROL, fojas, CBR).
context: fork
agent: data-ingestion-agent
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
disable-model-invocation: false
---

# Ingest Chilean Real Estate Data

Process the data from **$ARGUMENTS** and store it in the database.

## Requirements

1. **File Validation**: Parse and validate the input file format (CSV, JSON, or XML)
2. **Chilean Property Identifier Validation**: Verify ROL format (`/^\d{5}-\d{4}$/`), fojas, CBR numbers, and year (1900-present)
3. **Address Normalization**: Normalize Chilean addresses and geocode when possible
4. **Geographic Bounds Check**: Ensure coordinates are within Chile (lat -56.0 to -17.5, lng -76.0 to -66.0)
5. **Price Validation**: Detect outliers by commune and property type
6. **Database Insertion**: Insert validated records with proper error handling
7. **Quality Report**: Generate a summary with total records, valid/invalid counts, and error details

## Validation Rules Reference

- **ROL**: `XXXXX-XXXX` format
- **Commune**: Must be one of 346 Chilean communes
- **Region**: Must be one of 16 Chilean regions
- **CBR**: Valid Conservador de Bienes Raices office code
- **Surface**: Reasonable area checks per property type

## Output

Provide a structured quality metrics report upon completion.
