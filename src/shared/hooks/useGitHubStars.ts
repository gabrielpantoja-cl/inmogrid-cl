// src/hooks/useGitHubStars.ts
// Custom hook para usar la API de GitHub Stars con React

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchGithubStarsEnhanced, type FetchStarsResult } from '@/shared/lib/githubStars';

interface UseGitHubStarsOptions {
  token?: string;
  enabled?: boolean;
  refetchInterval?: number; // ms
  onError?: (error: string) => void;
}

interface UseGitHubStarsReturn extends FetchStarsResult {
  isLoading: boolean;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Hook personalizado para obtener estrellas de GitHub con manejo de estado React
 */
export function useGitHubStars(
  repo: string,
  options: UseGitHubStarsOptions = {}
): UseGitHubStarsReturn {
  const { token, enabled = true, refetchInterval, onError } = options;

  const [state, setState] = useState<{
    result: FetchStarsResult;
    isLoading: boolean;
    lastUpdated: Date | null;
  }>({
    result: { stars: null },
    isLoading: false,
    lastUpdated: null
  });

  // Guardamos onError en un ref para NO incluirlo en las dependencias de
  // useCallback. Si lo incluyéramos, cualquier consumidor que pase un
  // callback inline (función nueva en cada render) causaría que `fetchStars`
  // se re-crease en cada render → el useEffect de abajo dispararía fetch en
  // cada render → loop infinito de peticiones a api.github.com hasta que
  // Chrome devuelve ERR_INSUFFICIENT_RESOURCES.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const fetchStars = useCallback(async () => {
    if (!enabled || !repo) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await fetchGithubStarsEnhanced(repo, {
        token,
        useCache: true
      });

      setState({
        result,
        isLoading: false,
        lastUpdated: new Date()
      });

      if (result.error) {
        onErrorRef.current?.(result.error);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState({
        result: { stars: null, error: errorMessage },
        isLoading: false,
        lastUpdated: new Date()
      });

      onErrorRef.current?.(errorMessage);
    }
  }, [repo, token, enabled]);

  // Fetch inicial
  useEffect(() => {
    fetchStars();
  }, [fetchStars]);

  // Refetch automático si está configurado
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(fetchStars, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchStars, refetchInterval, enabled]);

  return {
    ...state.result,
    isLoading: state.isLoading,
    refetch: fetchStars,
    lastUpdated: state.lastUpdated
  };
}

/**
 * Hook simplificado que solo retorna el número de estrellas
 */
export function useGitHubStarsSimple(repo: string, token?: string): {
  stars: number | null;
  isLoading: boolean;
  error: string | null;
} {
  const { stars, isLoading, error } = useGitHubStars(repo, { token });
  
  return {
    stars,
    isLoading,
    error: error || null
  };
}
