// src/app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get('secret');
  const path = searchParams.get('path');

  // Verificar secreto
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
  }

  if (!path) {
    return NextResponse.json({ message: 'Missing path' }, { status: 400 });
  }

  try {
    // Revalidar la ruta específica
    revalidatePath(path);
    console.log(`✅ Revalidated path: ${path}`);
    return NextResponse.json({ revalidated: true, path, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error(`❌ Error revalidating path ${path}:`, err);
    return NextResponse.json(
      { message: 'Error revalidating', error: String(err) },
      { status: 500 }
    );
  }
}

// GET endpoint para testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST method to revalidate paths',
    usage: '/api/revalidate?secret=YOUR_SECRET&path=/path/to/revalidate',
    method: 'POST'
  });
}
