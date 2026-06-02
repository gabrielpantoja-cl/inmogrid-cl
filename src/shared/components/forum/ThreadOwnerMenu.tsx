'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  TrashIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/shared/hooks/useAuth';
import { ConfirmDialog } from './ConfirmDialog';
import { ReportDialog } from './ReportDialog';

interface Props {
  threadId: string;
  slug: string;
  /** ID del autor — se compara contra el user actual para decidir ownership. */
  authorId: string;
  /** Callback opcional — se llama tras borrar. Si se omite, router.refresh(). */
  onDeleted?: () => void;
  /** Si true, redirige a la home tras borrar. Útil en la página de detalle. */
  redirectAfterDelete?: boolean;
}

export function ThreadOwnerMenu({
  threadId,
  slug,
  authorId,
  onDeleted,
  redirectAfterDelete = false,
}: Props) {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const canEdit = !!user && (user.id === authorId || isAdmin);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/threads/${threadId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('fail');
      setConfirmDelete(false);
      if (redirectAfterDelete) {
        router.push('/');
        return;
      }
      if (onDeleted) onDeleted();
      else router.refresh();
    } catch {
      setDeleting(false);
      // Mantener el dialog abierto con un estado de error básico.
      alert('No se pudo borrar el hilo. Intenta de nuevo.');
    }
  };

  // Si no puede editar ni reportar (anónimo no-dueño), ocultamos el menú.
  if (!canEdit && !isAuthenticated) return null;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Más acciones"
          aria-haspopup="menu"
          aria-expanded={open}
          className="rounded-md p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <EllipsisHorizontalIcon className="h-5 w-5" />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            {canEdit && (
              <>
                <Link
                  href={`/foro/${slug}/editar`}
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Editar
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setConfirmDelete(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  Borrar
                </button>
              </>
            )}
            {isAuthenticated && !canEdit && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setReportOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <FlagIcon className="h-4 w-4" />
                Reportar
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        title="¿Borrar este hilo?"
        description="Esta acción no se puede deshacer. Los comentarios y likes asociados también se eliminarán."
        confirmLabel={deleting ? 'Borrando…' : 'Sí, borrar'}
        confirmDisabled={deleting}
        onConfirm={handleDelete}
        variant="danger"
      />

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="thread"
        targetId={threadId}
      />
    </>
  );
}
