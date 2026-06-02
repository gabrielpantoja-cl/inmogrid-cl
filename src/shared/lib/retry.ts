/**
 * Retry utilities for robust error handling
 * Útil para operaciones que pueden fallar temporalmente (DB, API externa, etc)
 */

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  shouldRetry: () => true,
};

/**
 * Ejecuta una función con retry automático en caso de error
 * @param fn Función a ejecutar
 * @param options Configuración de retry
 * @returns Resultado de la función
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: unknown;
  let currentDelay = opts.delayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Si no debemos reintentar este error, lanzarlo inmediatamente
      if (!opts.shouldRetry(error)) {
        throw error;
      }

      // Si fue el último intento, lanzar el error
      if (attempt === opts.maxAttempts) {
        console.error(`[RETRY] Max attempts (${opts.maxAttempts}) reached`, error);
        throw error;
      }

      // Log del intento fallido
      console.warn(`[RETRY] Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${currentDelay}ms`, error);

      // Esperar antes del siguiente intento
      await sleep(currentDelay);

      // Calcular el siguiente delay con backoff exponencial
      currentDelay = Math.min(
        currentDelay * opts.backoffMultiplier,
        opts.maxDelayMs
      );
    }
  }

  throw lastError;
}

/**
 * Promise-based sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ejecuta una función con timeout
 * @param fn Función a ejecutar
 * @param timeoutMs Timeout en milisegundos
 * @param errorMessage Mensaje de error personalizado
 * @returns Resultado de la función
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Combina retry y timeout
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  retryOptions: RetryOptions = {}
): Promise<T> {
  return withRetry(
    () => withTimeout(fn, timeoutMs),
    retryOptions
  );
}
