// src/types/index.ts
// Punto único de entrada para tipos compartidos del proyecto.
//
// Regla:
// - Enums de Prisma se re-exportan desde aquí para que el resto del código
//   no dependa directamente de `@prisma/client`.
// - Tipos de dominio (DTOs, shapes de API) cross-feature también viven aquí.
// - Tipos específicos de un feature deben vivir en `features/<feature>/types/`.

export {
  Role,
  ProfessionType,
  ConnectionStatus,
  EventStatus,
  EventType,
  OrganizerType,
} from '@prisma/client';

export type {
  Profile,
  Post,
  Connection,
  Event,
  ProfessionalProfile,
  AuditLog,
} from '@prisma/client';

// Re-exports locales existentes
export type { ValidationResult } from './types';

/**
 * Forma estándar de respuesta para la API pública de inmogrid.cl.
 * Mantenerla consistente facilita el consumo desde clientes externos.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  metadata?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
