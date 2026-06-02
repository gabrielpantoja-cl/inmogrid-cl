#!/usr/bin/env node
/**
 * Chequea si Vercel está sirviendo la versión nueva del Footer.
 * Usa un cache-buster y también consulta /api/public/health (no cacheable).
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });

async function fetchWith(url, label) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  const headers = response?.headers() || {};
  const footerHtml = await page.locator('footer').first().innerHTML().catch(() => '(no footer)');
  const hasGitHubLink = footerHtml.includes('Ver en GitHub');
  const hasOssLegend = footerHtml.includes('Proyecto open source');
  const hasStars = footerHtml.includes('github-stars-display');

  console.log(`\n━━ ${label} ━━`);
  console.log(`  URL: ${url}`);
  console.log(`  Status: ${response?.status()}`);
  console.log(`  x-vercel-cache: ${headers['x-vercel-cache'] || '(none)'}`);
  console.log(`  x-vercel-id:    ${headers['x-vercel-id'] || '(none)'}`);
  console.log(`  age:            ${headers['age'] || '0'}s`);
  console.log(`  date:           ${headers['date'] || '(none)'}`);
  console.log(`  → "Ver en GitHub" en footer:       ${hasGitHubLink ? '✅' : '❌'}`);
  console.log(`  → "Proyecto open source" en footer: ${hasOssLegend ? '✅' : '❌'}`);
  console.log(`  → widget github-stars-display:     ${hasStars ? '✅' : '❌'}`);

  await ctx.close();
  return { hasGitHubLink, hasOssLegend, hasStars };
}

const ts = Date.now();
const r1 = await fetchWith('https://inmogrid.cl/', '1. URL normal');
const r2 = await fetchWith(`https://inmogrid.cl/?_=${ts}`, '2. URL con cache-buster');

// health endpoint — nunca cacheado
const ctx = await browser.newContext();
const page = await ctx.newPage();
const healthRes = await page.goto('https://inmogrid.cl/api/public/health', { waitUntil: 'networkidle' });
const healthBody = await page.textContent('body');
const healthHeaders = healthRes?.headers() || {};
console.log(`\n━━ 3. /api/public/health ━━`);
console.log(`  Status: ${healthRes?.status()}`);
console.log(`  x-vercel-cache: ${healthHeaders['x-vercel-cache'] || '(none)'}`);
console.log(`  age: ${healthHeaders['age'] || '0'}s`);
console.log(`  body: ${healthBody?.slice(0, 300)}`);

// Un PATH que nunca existió antes: si devuelve 404 controlado por Next 15 nuevo,
// es señal de que el build nuevo está activo; si devuelve 404 genérico Vercel, no.
const probe = await page.goto('https://inmogrid.cl/__does-not-exist-probe', { waitUntil: 'networkidle' });
const probeHeaders = probe?.headers() || {};
console.log(`\n━━ 4. Probe de 404 (ruta inventada) ━━`);
console.log(`  Status: ${probe?.status()}`);
console.log(`  x-vercel-cache: ${probeHeaders['x-vercel-cache'] || '(none)'}`);
console.log(`  x-matched-path: ${probeHeaders['x-matched-path'] || '(none)'}`);

await ctx.close();
await browser.close();

console.log('\n━━━━ Veredicto ━━━━');
if (!r1.hasGitHubLink && !r2.hasGitHubLink) {
  console.log('❌ Ni con cache-buster aparece el Footer nuevo.');
  console.log('   → El build nuevo NO está sirviéndose. Probable: Vercel no deployó el último commit.');
  console.log('   → Verificá vercel.com → inmogrid → Deployments');
} else if (r2.hasGitHubLink && !r1.hasGitHubLink) {
  console.log('⚠️  Solo con cache-buster aparece — edge cache stale.');
  console.log('   → Redeploy o purge de cache arregla esto.');
} else {
  console.log('✅ El footer nuevo está en prod.');
}
