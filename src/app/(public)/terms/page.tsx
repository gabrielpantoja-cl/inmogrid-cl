/* app/(public)/terms/page.tsx */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos de Servicio · inmogrid.cl',
  alternates: { canonical: 'https://inmogrid.cl/terms' },
};
import TimeStamp from '@/shared/components/layout/common/TimeStamp';
import { promises as fs } from 'fs';
import path from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

export default async function TermsPage() {
  const currentDate = new Date().toLocaleDateString('es-CL');

  // Leer archivo markdown colocado junto a la página dentro del route
  // group `(public)`. Next.js ejecuta `process.cwd()` desde la raíz del
  // proyecto en build y en runtime serverless.
  const contentPath = path.join(
    process.cwd(),
    'src/app/(public)/terms/content.md'
  );
  const content = await fs.readFile(contentPath, 'utf8');

  // Convertir markdown a HTML
  const processedContent = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkHtml)
    .process(content);

  return (
    <main className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <TimeStamp date={currentDate} />

        {/* Contenido principal */}
        <div 
  className="markdown-content prose prose-slate max-w-none"
  dangerouslySetInnerHTML={{ __html: processedContent.toString() }}
        />

      </div>
    </main>
  );
}