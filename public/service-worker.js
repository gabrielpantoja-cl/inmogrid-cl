/**
 * Service Worker KILL SWITCH — inmogrid.cl
 *
 * CONTEXTO: Una versión muy vieja de este archivo (con un CACHE_NAME
 * legacy) quedó registrada en los browsers de muchos usuarios. Ese SW
 * viejo interceptaba todas las requests al dominio y tenía varios bugs:
 *
 *   - Cache namespace legacy inservible
 *   - fetch handler sin timeout que podía colgar la UI del browser
 *   - Fallback con `caches.match` que puede devolver undefined, causando
 *     respondWith(undefined) = comportamiento indefinido de Chrome
 *   - Sin lógica de auto-unregister
 *
 * Síntoma reportado: al tipear "inm..." en la omnibar de Chrome, el
 * browser entero se congelaba porque Chrome preconnect/prerender dispara
 * un fetch silencioso al dominio, el SW zombie lo intercepta, el fetch
 * queda pendiente, y respondWith() no resuelve nunca.
 *
 * ESTRATEGIA: Este archivo ya no registra caches ni intercepta requests.
 * Al contrario: cuando Chrome haga su update-check del SW (ocurre
 * automáticamente en cada navegación al dominio si pasó > 24h o si el
 * byte de servicio cambió), va a detectar esta nueva versión, instalarla
 * (skipWaiting inmediato), activarla, y la activación hace 3 cosas:
 *
 *   1. Eliminar todos los caches que haya creado el SW viejo.
 *   2. Unregister de sí mismo — deja de haber SW activo para el origen.
 *   3. Navigate() de todos los clientes abiertos, para que recarguen sin
 *      la referencia al SW viejo colgada.
 *
 * Una vez aplicado, cualquier usuario que visite inmogrid.cl por primera
 * vez con el update habilitado queda libre del SW zombie para siempre.
 *
 * Este archivo puede borrarse del repo en una futura limpieza (ej: 3-6
 * meses después del deploy) cuando estemos razonablemente seguros de que
 * casi nadie tiene el SW viejo cacheado. Eliminar antes de tiempo
 * dejaría a los zombies existentes sin forma de matarlos — Chrome NO
 * desregistra un SW solo porque el archivo devuelva 404 al update-check.
 *
 * Referencia: https://developer.chrome.com/docs/workbox/remove-buggy-service-workers
 */

// Install: tomar control lo antes posible, sin esperar a que el SW viejo
// se detenga por sus propios medios.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: limpiar todo rastro del SW viejo y desregistrarse.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // 1. Eliminar todos los caches creados por versiones anteriores.
        //    No filtramos por nombre — borramos todo, porque ya no usamos
        //    ningún cache propio.
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (err) {
        // Si el delete falla por alguna razón (permisos, storage lleno),
        // seguimos con el unregister de todas formas.
      }

      try {
        // 2. Desregistrarse. Esto marca el SW para baja; el browser lo
        //    removerá cuando el último cliente cierre / recargue.
        await self.registration.unregister();
      } catch (err) {
        // No debería fallar, pero si falla no es bloqueante.
      }

      try {
        // 3. Forzar un reload de todos los clientes abiertos (pestañas con
        //    inmogrid.cl), para que suelten la referencia al SW y carguen
        //    la página sin interceptación.
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        for (const client of clients) {
          // navigate() recarga preservando la URL actual.
          if ('navigate' in client) {
            await client.navigate(client.url).catch(() => {});
          }
        }
      } catch (err) {
        // No bloqueante.
      }
    })()
  );
});

// Fetch handler vacío. NO interceptamos ninguna request — dejamos que
// el browser las maneje de forma nativa. Esto es crítico porque es
// exactamente el bug que causaba el freeze de la omnibar.
// (Deliberadamente no registramos el listener — basta con no tenerlo.)
