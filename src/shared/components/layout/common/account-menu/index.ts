/**
 * Primitivos compartidos para el menú de cuenta (dropdown + hook de
 * estado). Usados por el `PublicHeader` de todo el sitio.
 *
 * La eliminación de cuenta **no está** en este barrel. Vive en el feature
 * `profiles` (`DangerZone` componente en `features/profiles/components`)
 * y solo se monta desde `/perfil`. Ver ADR-004 para el diseño del patrón
 * "shared primitive vs contextual composer".
 */
export { AccountMenu } from './AccountMenu';
export { useAccountActions } from './useAccountActions';
