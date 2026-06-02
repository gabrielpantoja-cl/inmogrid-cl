// __tests__/__helpers__/constants.js

/**
 * Constantes de rutas para navegación
 */
export const ROUTES = {
  HOME: 'http://localhost:3000',
  LOGIN: '/auth/signin',  // Ruta por defecto de NextAuth
  DASHBOARD: '/dashboard'
};

/**
 * Test IDs para testing
 */
export const TEST_IDS = {
  LOADING_SPINNER: 'loading-spinner',
  LOGIN_FORM: 'login-form',
  GOOGLE_BUTTON: 'google-auth-button',
  ERROR_MESSAGE: 'error-message'
};

// Verificar que el archivo que importa use:
// import { TEST_IDS, ROUTES } from '@/__tests__/helpers/constants';