import { Metadata } from 'next';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { ComingSoon } from '@/shared/components/layout/public/ComingSoon';

export const metadata: Metadata = {
  title: 'Eventos',
  description:
    'Calendario de talleres, cursos y encuentros del sector inmobiliario chileno. Próximamente.',
};

export default function EventosPage() {
  return (
    <ComingSoon
      title="Calendario de eventos"
      description="Talleres, cursos, charlas y encuentros del sector inmobiliario. Gratuitos y comerciales, organizados por la comunidad y profesionales del rubro."
      icon={<CalendarIcon className="w-8 h-8" aria-hidden="true" />}
    />
  );
}
