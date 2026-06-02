// Barrel público del feature `referenciales`.
// Consumidores (app/, otros features NO permitidos) deben importar desde aquí.

export { default as ReferencialesMap } from './components/ReferencialesMap';
export { default as ReferencialesStats } from './components/ReferencialesStats';
export { default as ReportModal } from './components/ReportModal';
export { default as ReferencialesExplorer } from './components/ReferencialesExplorer';
export type { ExplorerMode } from './components/ReferencialesExplorer';
export {
  fetchReferenciales,
  fetchComunas,
  fetchReferencialesAuth,
  fetchComunasAuth,
  parseMontoCLP,
  formatCLP,
  REFERENCIALES_API_BASE,
} from './lib/api';
export type {
  Referencial,
  MapDataResponse,
  MapDataFilters,
  MapDataExtendedFilters,
  ComunasResponse,
} from './lib/api';
export { toCSV, downloadCSV } from './lib/csv';
export { maskName, maskObservaciones, maskByRole } from './lib/mask';
export {
  detectSuspicious,
  labelForFlag,
} from './lib/flags';
export type {
  SuspicionResult,
  SuspicionLevel,
  SuspiciousFlag,
} from './lib/flags';
