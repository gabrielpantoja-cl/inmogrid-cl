'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';

const ITEMS = [
  { href: '/cuenta', label: 'General', icon: UserCircleIcon, exact: true },
  { href: '/cuenta/seguridad', label: 'Seguridad', icon: ShieldCheckIcon },
  { href: '/cuenta/datos', label: 'Mis datos', icon: CircleStackIcon },
];

export function CuentaSidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación de cuenta" className="md:sticky md:top-20 md:self-start">
      <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
        {ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-gray-900 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
