'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ThreadHit {
  id: string;
  title: string;
  slug: string;
  preview: string;
  author: { username: string | null; fullName: string | null };
}

export function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [debounced] = useDebounce(value, 250);
  const [results, setResults] = useState<ThreadHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/public/threads?q=${encodeURIComponent(q)}&limit=8`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setResults(data.threads ?? []))
      .catch(() => void 0)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debounced]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSelect = (slug: string) => {
    setOpen(false);
    setValue('');
    router.push(`/foro/${slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Enter' && results[0]) {
      e.preventDefault();
      handleSelect(results[0].slug);
    }
  };

  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 focus-within:bg-white focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-primary/20 transition-colors">
        <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar hilos del foro…"
          aria-label="Buscar hilos del foro"
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              setResults([]);
            }}
            aria-label="Limpiar"
            className="shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Sin resultados para &ldquo;{value}&rdquo;.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={`/foro/${hit.slug}`}
                    onClick={() => {
                      setOpen(false);
                      setValue('');
                    }}
                    className="block px-4 py-2.5 hover:bg-gray-50"
                  >
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">
                      {hit.title}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                      {hit.preview || 'Sin vista previa'}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
