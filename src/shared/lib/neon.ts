import postgres from 'postgres';

declare global {
  // eslint-disable-next-line no-var
  var _neonDb: postgres.Sql | undefined;
}

function createNeonClient(): postgres.Sql {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) {
    throw new Error(
      'NEON_DATABASE_URL is not set. Add it to .env.local for development or Vercel env vars for production.'
    );
  }
  return postgres(url, {
    ssl: 'require',
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

/**
 * Lazy-initialized Neon client singleton.
 * Defers connection creation until first use to avoid build-time errors
 * when NEON_DATABASE_URL is not available (e.g., during `next build`).
 */
export function getNeonDb(): postgres.Sql {
  if (!global._neonDb) {
    global._neonDb = createNeonClient();
  }
  return global._neonDb;
}

/**
 * Tests the Neon connection with a simple SELECT 1 query.
 * Returns status and response time in milliseconds.
 */
export async function testNeonConnection(): Promise<{
  status: 'up' | 'down';
  responseTime: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const sql = getNeonDb();
    await sql`SELECT 1 as test`;
    return { status: 'up', responseTime: Date.now() - start };
  } catch (err) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
