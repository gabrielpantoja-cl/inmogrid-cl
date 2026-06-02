'use client';

import dynamic from 'next/dynamic';

const SofiaChatInterface = dynamic(
  () => import('@/features/sofia-chat/components/SofiaChatInterface'),
  { ssr: false }
);

export default function SofiaClientWrapper() {
  return <SofiaChatInterface />;
}
