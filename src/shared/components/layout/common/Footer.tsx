import React from 'react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="mt-16 py-12 bg-gray-900 border-t-2 border-primary/50">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-y-8 md:gap-x-8">
        <div className="flex flex-col items-center md:items-start gap-1">
          <Link href="/" className="text-lg font-semibold text-white hover:text-primary transition-colors">
            inmogrid.cl
          </Link>
          <span className="text-xs text-gray-400">
            Desarrollado por{' '}
            <a
              href="https://www.loxos.cl/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-gray-200 transition-colors"
            >
              Loxos
            </a>
          </span>
        </div>

        <div className="flex flex-col items-center md:items-start gap-y-1">
          {/* Sofia IA — desactivada temporalmente.
          <Link href="/sofia" className="text-sm text-gray-400 hover:text-primary transition-colors">
            Chat Sof&iacute;a
          </Link>
          */}
          <Link href="/referenciales" className="text-sm text-gray-400 hover:text-primary transition-colors">
            Referenciales
          </Link>
          <Link href="/directorio" className="text-sm text-gray-400 hover:text-primary transition-colors">
            Directorio
          </Link>
          <Link href="/terms" className="text-sm text-gray-400 hover:text-primary transition-colors">
            T&eacute;rminos
          </Link>
          <Link href="/privacy" className="text-sm text-gray-400 hover:text-primary transition-colors">
            Privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
