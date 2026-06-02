import Link from 'next/link';

export const metadata = {
  title: 'Página no encontrada',
};

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">Página no encontrada</h1>
      <p className="mt-2 text-gray-500 max-w-sm">
        La dirección que buscas no existe o fue movida.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link
          href="/"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Inicio
        </Link>
        <Link
          href="/referenciales"
          className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Mapa
        </Link>
        {/* Sofia IA — desactivada temporalmente.
        <Link
          href="/sofia"
          className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Chat Sofía
        </Link>
        */}
      </div>
    </main>
  );
}
