'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ReferencialesExplorer,
  ReportModal,
  type Referencial,
} from '@/features/referenciales';
import { SignInPromptDialog } from '@/shared/components/forum/SignInPromptDialog';
import ContributeModal from './_ContributeModal';

interface Props {
  isAuthenticated: boolean;
}

/**
 * Wrapper client del explorador de referenciales.
 *
 * Un solo `/referenciales` para todos — los usuarios anónimos ven el mapa
 * completo con filtros avanzados. Las acciones mutantes ("+ Contribuir",
 * "Reportar dato sospechoso" en los popups) disparan un modal de login
 * si no hay sesión, en vez de redirigir a otra URL.
 *
 * El `mode` del `ReferencialesExplorer` sigue dictando qué endpoint usa
 * (`/api/v1/map-data` rate-limited vs `/api/referenciales/map-data` sin
 * límite + filtros extra). Los usuarios no-auth usan el modo público por
 * defecto; los auth van directo al endpoint sin rate-limit.
 */
export default function ReferencialesClient({ isAuthenticated }: Props) {
  const router = useRouter();
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [signInPrompt, setSignInPrompt] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<Referencial | null>(null);

  const handleContributeClick = () => {
    if (!isAuthenticated) {
      setSignInPrompt('aportar un referencial');
      return;
    }
    setShowContributeModal(true);
  };

  const handleReportTarget = (r: Referencial) => {
    if (!isAuthenticated) {
      setSignInPrompt('reportar un dato sospechoso');
      return;
    }
    setReportTarget(r);
  };

  const handleContributeSuccess = () => {
    setShowContributeModal(false);
    router.push('/referenciales/mis-aportes');
  };

  const handleReportSuccess = () => {
    setReportTarget(null);
    router.push('/referenciales/mis-aportes');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Mapa</h1>
        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated && (
            <Link
              href="/referenciales/mis-aportes"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Mis aportes
            </Link>
          )}
          <button
            onClick={handleContributeClick}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-primary/90"
          >
            + Contribuir
          </button>
        </div>
      </div>

      <ReferencialesExplorer
        mode={isAuthenticated ? 'authenticated' : 'public'}
        onReport={handleReportTarget}
      />

      <footer className="mt-4 border-t border-gray-200 pt-6 text-xs text-gray-500">
        Fuentes: Conservadores de Bienes Raíces (CBR) de Chile. Datos
        procesados y actualizados periódicamente. La información es
        referencial y no garantiza exactitud — consulta a un profesional
        para decisiones de inversión. Cumplimiento Ley 19.628 sobre
        protección de datos personales.
      </footer>

      {showContributeModal && (
        <ContributeModal
          onClose={() => setShowContributeModal(false)}
          onSuccess={handleContributeSuccess}
        />
      )}

      {reportTarget && (
        <ReportModal
          referencial={reportTarget}
          onClose={() => setReportTarget(null)}
          onSuccess={handleReportSuccess}
        />
      )}

      <SignInPromptDialog
        open={signInPrompt !== null}
        onClose={() => setSignInPrompt(null)}
        reason={signInPrompt ?? undefined}
        redirectTo="/referenciales"
      />
    </div>
  );
}
