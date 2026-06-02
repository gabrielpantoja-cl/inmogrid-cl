import { NextResponse } from 'next/server';

// Endpoint de documentación interna deshabilitado.
// Sirve los markdown de /docs al visor en /admin/docs. Mientras esa página esté
// apagada, este handler también — para reactivarlo descomentar el bloque de abajo
// y reemplazar el stub.
export async function GET() {
  return new NextResponse('Documento no encontrado', { status: 404 });
}

/*
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;

    // Reject path segments that attempt directory traversal
    if (resolvedParams.path.some(segment => segment === '..' || segment === '.' || segment.includes('\0'))) {
      return new NextResponse('Ruta no permitida', { status: 400 });
    }

    const docsDir = resolve(process.cwd(), 'docs');
    const filePath = resolve(docsDir, `${resolvedParams.path.join('/')}.md`);

    // Ensure resolved path stays within docs directory
    if (!filePath.startsWith(docsDir + '/')) {
      return new NextResponse('Ruta no permitida', { status: 400 });
    }

    const content = await readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error reading documentation file:', error);
    return new NextResponse('Documento no encontrado', { status: 404 });
  }
}
*/
