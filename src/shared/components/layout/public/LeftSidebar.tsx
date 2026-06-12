'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChatBubbleLeftRightIcon,
  MapIcon,
  // SparklesIcon, // reactivar junto con la entrada de Sofia abajo
  DocumentDuplicateIcon,
  CalendarIcon,
  BuildingLibraryIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
  comingSoon?: boolean;
  /** Solo visible para usuarios autenticados */
  authOnly?: boolean;
  /** Solo visible para admins (requiere también autenticación) */
  adminOnly?: boolean;
}

// Orden del sidebar: Foro → Blog → Eventos → Mapa → Directorio.
// Foro es el core del producto; Blog y Eventos siguen como contenido
// editorial/eventual; Mapa es la herramienta clave; Directorio cierra la
// lista como catálogo (fusión de Conservadores + Comunidad en una ruta
// con tabs).
const PRIMARY: NavItem[] = [
  { href: '/', label: 'Foro', icon: ChatBubbleLeftRightIcon },
  { href: '/blog', label: 'Blog', icon: DocumentDuplicateIcon },
  { href: '/eventos', label: 'Eventos', icon: CalendarIcon, comingSoon: true },
  { href: '/referenciales', label: 'Mapa', icon: MapIcon },
  { href: '/tasacion', label: 'Tasación', icon: CalculatorIcon },
  { href: '/directorio', label: 'Directorio', icon: BuildingLibraryIcon },
  // Sofia — desactivada. Para reactivar: (1) descomentar esta línea +
  // las de PublicHeader y sitemap; (2) renombrar en app/:
  //   `(public)/_sofia-disabled` → `(public)/sofia`
  //   `api/_sofia-disabled`      → `api/sofia`
  // El feature vive en `features/sofia-chat/` con toda su lógica RAG intacta.
  // { href: '/sofia', label: 'Sofía', icon: SparklesIcon },
];

const SECONDARY: NavItem[] = [];

// La sección "Mi cuenta" fue migrada al AccountMenu (dropdown arriba a la
// derecha) cuando eliminamos el concepto de dashboard. El sidebar queda
// solo con navegación de recursos del ecosistema — las acciones personales
// (editar perfil, mis aportes, admin) viven en el dropdown del avatar.
const ACCOUNT: NavItem[] = [];

interface LeftSidebarProps {
  onNavigate?: () => void;
}

export function LeftSidebar({ onNavigate }: LeftSidebarProps) {
  const pathname = usePathname();
  const { isAuthenticated, isAdmin } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const canSee = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.authOnly && !isAuthenticated) return false;
    return true;
  };

  const mainItems = [...PRIMARY, ...SECONDARY].filter(canSee);
  const accountItems = ACCOUNT.filter(canSee);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${
            active
              ? 'bg-primary/10 text-gray-900 font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Icon className="w-5 h-5 shrink-0" aria-hidden />
          <span className="flex-1 truncate">{item.label}</span>
          {item.comingSoon && (
            <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Pronto
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Navegación principal"
      className="flex flex-col gap-6 p-4 text-sm"
    >
      <ul className="space-y-0.5">{mainItems.map(renderItem)}</ul>

      {accountItems.length > 0 && (
        <div>
          <p className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Mi cuenta
          </p>
          <ul className="space-y-0.5">{accountItems.map(renderItem)}</ul>
        </div>
      )}

      {/* Legales al pie del sidebar — único acceso desde que eliminamos
          el footer global. Son links discretos pero siempre visibles en
          cualquier ruta con shell público (incluye auth y no-auth). */}
      <div className="mt-auto pt-4 flex gap-3 text-[11px] text-gray-400">
        <Link href="/privacy" className="hover:text-gray-700 transition-colors">
          Privacidad
        </Link>
        <Link href="/terms" className="hover:text-gray-700 transition-colors">
          Términos
        </Link>
      </div>
    </nav>
  );
}
