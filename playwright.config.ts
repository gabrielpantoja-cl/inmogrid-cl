import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para inmogrid.cl
 * Tests E2E de autenticación OAuth 2.0 con Google
 */
export default defineConfig({
  testDir: './__tests__/e2e',

  // Tiempo máximo por test (OAuth puede tardar)
  timeout: 60 * 1000,

  // Reintentos en caso de fallo (útil para OAuth)
  retries: process.env.CI ? 2 : 1,

  // Workers paralelos
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }]
  ],

  use: {
    // Base URL del VPS en producción
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://inmogrid.cl',

    // Tomar screenshots en fallos
    screenshot: 'only-on-failure',

    // Grabar video en fallos
    video: 'retain-on-failure',

    // Trace para debugging
    trace: 'retain-on-failure',

    // Timeout de navegación
    navigationTimeout: 30 * 1000,
  },

  projects: [
    // Setup: Autenticación (se ejecuta antes de los tests)
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Tests en Chromium (Chrome)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Usar estado de autenticación guardado
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Tests en Firefox
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Servidor de desarrollo local (opcional)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});