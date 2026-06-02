/**
 * 🧪 Test E2E - Homepage Authentication Redirect
 *
 * Este test verifica que el flujo de autenticación se inicie correctamente
 * desde la página de inicio. A diferencia de otros tests, este no utiliza
 * un estado de autenticación previo.
 *
 * Flujo:
 * 1. Carga la página de inicio (`/`).
 * 2. Acepta los términos y condiciones.
 * 3. Hace clic en el botón "Iniciar sesión con Google".
 * 4. Verifica que se redirige a la página de autenticación de Google.
 */

import { test, expect } from '@playwright/test';

test.describe('🏠 Homepage Authentication Flow', () => {
  // Este test NO usa un estado de autenticación guardado.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should redirect to Google when clicking Sign In', async ({ page }) => {
    // 1. Navegar a la página de inicio
    await page.goto('/');
    console.log('🌍 Navigated to homepage.');

    // 2. Aceptar los términos y condiciones para habilitar el botón
    const termsCheckbox = page.locator('#acceptTerms');
    await expect(termsCheckbox).toBeVisible({ timeout: 10000 });
    await termsCheckbox.check();
    console.log('✅ Accepted Terms and Conditions.');

    // 3. Localizar y hacer clic en el botón de inicio de sesión con Google
    const signInButton = page.locator('button:has-text("Iniciar sesión con Google")');
    await expect(signInButton).toBeEnabled();
    await signInButton.click();
    console.log('🖱️ Clicked "Iniciar sesión con Google" button.');

    // 4. Esperar a que la página navegue y verificar la URL de Google
    // Usamos waitForURL para manejar la redirección de manera robusta.
    console.log('⏳ Waiting for redirection to Google...');
    await page.waitForURL('**/accounts.google.com/**', { timeout: 15000 });
    
    // 5. Verificar que la URL actual es la de autenticación de Google
    const currentUrl = page.url();
    console.log(`🧭 Redirected to: ${currentUrl}`);
    expect(currentUrl).toContain('accounts.google.com');

    console.log('✅ Successfully redirected to Google authentication page.');
  });
});
