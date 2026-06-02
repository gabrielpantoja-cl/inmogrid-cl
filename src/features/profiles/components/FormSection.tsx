import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Contenedor estándar para secciones del formulario de perfil.
 * Estilo compartido: card blanca, título con emoji, padding consistente.
 */
export function FormSection({ title, children, className = '' }: FormSectionProps) {
  return (
    <div className={`rounded-xl bg-white p-6 shadow-sm border border-gray-200 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

const baseInput =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent';

interface TextFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'tel' | 'url' | 'email';
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
}

export function TextField({
  id,
  name,
  label,
  value,
  onChange,
  type = 'text',
  required,
  maxLength,
  placeholder,
  hint,
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        className={baseInput}
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

interface TextAreaFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
}

export function TextAreaField({
  id,
  name,
  label,
  value,
  onChange,
  rows = 4,
  maxLength,
  placeholder,
  hint,
}: TextAreaFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className={`${baseInput} resize-none`}
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  disabled?: boolean;
  hint?: string;
}

export function SelectField({
  id,
  name,
  label,
  value,
  onChange,
  options,
  disabled,
  hint,
}: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${baseInput} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
