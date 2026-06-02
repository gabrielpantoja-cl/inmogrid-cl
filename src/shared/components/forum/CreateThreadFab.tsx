'use client';

import Link from 'next/link';
import { PencilSquareIcon } from '@heroicons/react/24/solid';

interface Props {
  /** Si el viewer ya está autenticado server-side, lo pasamos para que el
   *  link salte directo al editor. Si no, sigue al login con `?next=`. */
  authenticated: boolean;
}

/**
 * FAB para crear un hilo desde mobile. Sticky bottom-right con offset
 * suficiente para no tapar el chat bubble (que vive en bottom-left).
 *
 * En desktop ≥md ocultamos el FAB porque el header del feed ya tiene un
 * botón "Crear hilo" prominente en su sticky bar y el sidebar derecho
 * tiene un CTA dedicado.
 */
export function CreateThreadFab({ authenticated }: Props) {
  const href = authenticated ? '/foro/nuevo' : '/auth/login?next=/foro/nuevo';
  return (
    <Link
      href={href}
      aria-label="Crear hilo"
      className="md:hidden fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all"
    >
      <PencilSquareIcon className="h-5 w-5" aria-hidden />
      <span>Crear hilo</span>
    </Link>
  );
}
