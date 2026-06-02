'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { z } from 'zod';

const emailSchema = z.string().email('Ingresa un email válido.');

interface ComingSoonProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export function ComingSoon({ title, description, icon }: ComingSoonProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Email inválido.');
      return;
    }
    setSubmitted(true);
    toast.success('Te avisaremos cuando esté listo.');
  };

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center">
        <span className="inline-flex w-16 h-16 rounded-2xl bg-primary/15 text-primary items-center justify-center mb-6">
          {icon}
        </span>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{title}</h1>
        <p className="mt-3 text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
          {description}
        </p>
        <p className="mt-4 inline-block text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-3 py-1 rounded-full">
          Próximamente
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-10 bg-white rounded-xl border border-gray-200 p-5 md:p-6"
      >
        <label htmlFor="coming-soon-email" className="block text-sm font-medium text-gray-900">
          Avísame cuando esté listo
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Te mandamos un correo cuando esta sección esté disponible. Sin spam.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            id="coming-soon-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.cl"
            disabled={submitted}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-gray-50 disabled:text-gray-500"
          />
          <button
            type="submit"
            disabled={submitted}
            className="rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-primary-foreground transition-colors"
          >
            {submitted ? '¡Listo!' : 'Avísame'}
          </button>
        </div>
      </form>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
