import { NextResponse } from 'next/server';

/**
 * Standard CORS headers for public API endpoints.
 */
export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };
}

/**
 * Handle OPTIONS preflight request for CORS.
 */
export function handleOptions(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
