import { useEffect, useRef, useState } from 'react';
import { FormSection, TextField, TextAreaField } from '../FormSection';
import type { ProfileFormData } from '../../types';

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

interface UsernameFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function UsernameField({ value, onChange }: UsernameFieldProps) {
  const [status, setStatus] = useState<CheckStatus>('idle');
  const [message, setMessage] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChecked = useRef('');

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim().toLowerCase();

    if (!trimmed) {
      setStatus('idle');
      setMessage('');
      return;
    }

    // Validación inmediata de formato (sin fetch)
    if (trimmed.length < 3) {
      setStatus('invalid');
      setMessage('Mínimo 3 caracteres');
      return;
    }
    if (trimmed.length > 30) {
      setStatus('invalid');
      setMessage('Máximo 30 caracteres');
      return;
    }
    if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(trimmed)) {
      setStatus('invalid');
      setMessage('Solo letras minúsculas, números, - y _. No puede empezar ni terminar con guión.');
      return;
    }

    if (trimmed === lastChecked.current) return; // ya verificado

    setStatus('checking');
    setMessage('');

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/username/check?username=${encodeURIComponent(trimmed)}`
        );
        const data = (await res.json()) as { available: boolean; message: string };
        lastChecked.current = trimmed;
        setStatus(data.available ? 'available' : 'taken');
        setMessage(data.message);
      } catch {
        setStatus('idle');
        setMessage('');
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const statusUI: Record<CheckStatus, { icon: string; color: string } | null> = {
    idle:      null,
    checking:  { icon: '…', color: 'text-gray-400' },
    available: { icon: '✓', color: 'text-green-600' },
    taken:     { icon: '✗', color: 'text-red-600' },
    invalid:   { icon: '⚠', color: 'text-yellow-600' },
  };

  const ui = statusUI[status];

  return (
    <div>
      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
        Username
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm select-none pointer-events-none">
          inmogrid.cl/
        </span>
        <input
          id="username"
          name="username"
          type="text"
          value={value}
          onChange={onChange}
          maxLength={30}
          placeholder="tu-usuario"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="w-full pl-[6.5rem] pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
        />
        {ui && (
          <span
            className={`absolute inset-y-0 right-3 flex items-center text-sm font-semibold ${ui.color}`}
          >
            {ui.icon}
          </span>
        )}
      </div>
      <p className={`mt-1 text-xs ${status === 'available' ? 'text-green-600' : status === 'taken' || status === 'invalid' ? 'text-red-600' : 'text-gray-500'}`}>
        {message || 'Solo letras minúsculas, números, guiones y guiones bajos (3–30 caracteres).'}
      </p>
    </div>
  );
}

interface Props {
  formData: ProfileFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
}

export function BasicInfoSection({ formData, onChange }: Props) {
  return (
    <FormSection title="Información básica">
      <div className="space-y-4">
        <UsernameField value={formData.username} onChange={onChange} />
        <TextField
          id="fullName"
          name="fullName"
          label="Nombre"
          value={formData.fullName}
          onChange={onChange}
          required
          maxLength={100}
          placeholder="Tu nombre completo"
        />
        <TextField
          id="tagline"
          name="tagline"
          label="Tagline (frase corta)"
          value={formData.tagline}
          onChange={onChange}
          maxLength={100}
          placeholder="Ej: Desarrollador full stack apasionado por PropTech"
          hint="Máximo 100 caracteres. Aparece debajo de tu nombre en el perfil."
        />
        <TextAreaField
          id="bio"
          name="bio"
          label="Biografía"
          value={formData.bio}
          onChange={onChange}
          rows={4}
          maxLength={500}
          placeholder="Cuéntanos sobre ti, tu experiencia, tus intereses..."
          hint={`${formData.bio.length}/500 caracteres`}
        />
      </div>
    </FormSection>
  );
}
