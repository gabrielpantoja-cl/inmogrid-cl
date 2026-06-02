'use client';

import type { ReactNode } from 'react';
import { X, Shield } from 'lucide-react';
import { Button } from '@/shared/components/ui/primitives/button';
import { Card } from '@/shared/components/ui/primitives/card';

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  maxWidth?: 'max-w-3xl' | 'max-w-4xl';
}

/**
 * Carcasa común para los modales de configuración de cookies:
 * overlay + Card + header con gradiente + cuerpo scrollable + footer.
 */
export function CookieModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-3xl',
}: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black bg-opacity-60">
      <Card className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto bg-white shadow-2xl`}>
        <div className="relative">
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6" />
                <div>
                  <h2 className="text-2xl font-bold">{title}</h2>
                  {subtitle && <p className="text-yellow-50 text-sm">{subtitle}</p>}
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p-6">{children}</div>

          <div className="bg-gray-50 px-6 py-4 border-t rounded-b-lg">{footer}</div>
        </div>
      </Card>
    </div>
  );
}
