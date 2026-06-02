import type { Metadata } from 'next';
import SofiaClientWrapper from './SofiaClientWrapper';

export const metadata: Metadata = {
  title: 'Sofia — Asistente inmobiliario IA',
  description:
    'Pregunta a Sofia sobre tasaciones, peritajes, normativas CBR y el mercado inmobiliario chileno. Asistente IA gratuita.',
  openGraph: {
    title: 'Sofia — Asistente inmobiliario IA',
    description: 'Pregunta sobre tasaciones, peritajes y bienes raíces en Chile.',
  },
};

export default function SofiaPage() {
  return <SofiaClientWrapper />;
}
