// Prueba E2E en un navegador real (Chrome instalado) y capturas para la documentación.
// Uso: npx tsx scripts/e2e.mts [http://localhost:3000] [owner/repo] [estilo: Divulgativo|Técnico|Humor]
// Requiere el servidor arrancado (npm run dev) y la cuenta demo (npm run db:seed).
import { mkdirSync, existsSync } from 'node:fs';
import { chromium, type Page } from 'playwright-core';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const REPO = process.argv[3] ?? 'pmndrs/zustand';
const STYLE = process.argv[4] ?? 'Divulgativo';
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => existsSync(p));

const t0 = Date.now();
const log = (msg: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)} s] ${msg}`);
const shot = async (page: Page, name: string, fullPage = false) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  log(`📸 ${name}.png`);
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', locale: 'es-ES', acceptDownloads: true });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

try {
  // 1. Landing
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await shot(page, '01-landing');

  // 2. Registro de una cuenta nueva (sin confirmación de email)
  const email = `e2e-${Date.now()}@repocast.app`;
  await page.goto(`${BASE}/registro`);
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', 'Prueba-e2e-1234');
  await page.click('button:has-text("Crear cuenta")');
  await page.waitForURL((u) => !u.pathname.startsWith('/registro'), { timeout: 20_000 });
  log(`✅ registro OK (${email}) → ${new URL(page.url()).pathname}`);
  await page.click('[aria-label="Cerrar sesión"]');
  await page.waitForLoadState('networkidle');
  log('✅ logout OK');

  // 3. Login con la cuenta demo
  await page.goto(`${BASE}/entrar`);
  await shot(page, '02-login');
  await page.click('button:has-text("Probar con la cuenta demo")');
  await page.waitForURL((u) => !u.pathname.startsWith('/entrar'), { timeout: 20_000 });
  log('✅ login demo OK');

  // 4. Nuevo podcast
  await page.goto(`${BASE}/nuevo?repo=${encodeURIComponent(`https://github.com/${REPO}`)}`, { waitUntil: 'networkidle' });
  await page.locator(`label:has-text("${STYLE}")`).first().click();
  await shot(page, '03-nuevo');
  await page.click('button:has-text("Generar podcast")');
  await page.waitForURL(/\/e\//, { timeout: 60_000 });
  const slug = new URL(page.url()).pathname.split('/').pop()!;
  log(`✅ episodio creado: /e/${slug}`);

  // 5. Generación (pasos) hasta que aparece el reproductor
  // Si el episodio ya existía (mismos ajustes), se reutiliza y no hay pantalla de progreso
  await page.waitForTimeout(6000);
  if (await page.getByText('Preparando tu episodio').isVisible()) await shot(page, '04-generando');
  else log('ℹ️  episodio reutilizado: sin pantalla de progreso');
  await page.waitForSelector('[aria-label="Reproducir"]', { timeout: 420_000 });
  await page.waitForTimeout(2500);
  log('✅ episodio listo');
  await shot(page, '05-episodio-mapa');

  // 6. Reproducir unos segundos (transcripción sincronizada)
  await page.click('[aria-label="Reproducir"]');
  await page.waitForTimeout(5000);
  await shot(page, '06-reproduciendo');
  await page.click('[aria-label="Pausar"]');

  // 7. Pestañas
  await page.click('[role=tab]:has-text("Visita guiada")');
  await page.waitForTimeout(3000);
  await shot(page, '07-visita-guiada');

  await page.click('[role=tab]:has-text("Chat")');
  await page.fill('input[placeholder*="autenticación"], textarea[placeholder*="autenticación"]', '¿Cómo se crea un store y cómo se suscriben los componentes?');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  await page.waitForSelector('[aria-label="Escribiendo"]', { state: 'detached', timeout: 90_000 });
  await page.waitForTimeout(1500);
  log('✅ chat respondió');
  await shot(page, '08-chat');

  await page.click('[role=tab]:has-text("Compartir")');
  await page.waitForTimeout(2500);
  await shot(page, '09-compartir');

  // 7b. Capítulos, diagrama de flujo, notas y guía escrita
  const chapters = await page.locator('nav[aria-label="Capítulos"] button').count();
  log(`✅ ${chapters} capítulos`);
  if (await page.locator('[role=tab]:has-text("Flujo")').count()) {
    await page.click('[role=tab]:has-text("Flujo")');
    await page.waitForSelector('svg[aria-label^="Diagrama de secuencia"]', { timeout: 90_000 });
    await page.waitForTimeout(500);
    log('✅ diagrama de flujo');
    await shot(page, '14-flujo');
  }
  await page.click('[role=tab]:has-text("Notas")');
  await page.fill('#note-text', 'Revisar cómo se suscriben los componentes');
  await page.click('button:has-text("Guardar nota")');
  await page.waitForSelector('li:has-text("Revisar cómo se suscriben")');
  log('✅ nota guardada');
  await shot(page, '15-notas');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('a:has-text("Markdown")')]);
  const markdown = await download.path().then((p) => (p ? import('node:fs').then((fs) => fs.readFileSync(p, 'utf8')) : ''));
  log(`✅ guía Markdown (${markdown.length} caracteres, con la nota: ${markdown.includes('Revisar cómo se suscriben')})`);
  await page.locator('button[aria-label="Borrar nota"]').first().click({ force: true });
  const guide = await context.newPage();
  await guide.goto(`${BASE}/e/${slug}/guia`, { waitUntil: 'networkidle' });
  await guide.waitForSelector('article h1', { timeout: 90_000 });
  await guide.screenshot({ path: `${OUT}/16-guia.png` });
  log('📸 16-guia.png');
  await guide.close();

  // 8. Página pública sin sesión, embed y badge
  const anon = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const anonPage = await anon.newPage();
  await anonPage.goto(`${BASE}/e/${slug}`, { waitUntil: 'networkidle' });
  await anonPage.waitForSelector('[aria-label="Reproducir"]', { timeout: 30_000 });
  log('✅ página pública visible sin sesión');
  await anonPage.setViewportSize({ width: 720, height: 152 });
  await anonPage.goto(`${BASE}/embed/${slug}`, { waitUntil: 'networkidle' });
  await anonPage.screenshot({ path: `${OUT}/10-embed.png` });
  log('📸 10-embed.png');
  const badge = await anonPage.request.get(`${BASE}/api/badge/${slug}`);
  log(`✅ badge ${badge.status()} ${badge.headers()['content-type']}`);
  await anon.close();

  // 9. Mis podcasts y explorar
  await page.goto(`${BASE}/mis-podcasts`, { waitUntil: 'networkidle' });
  await shot(page, '11-mis-podcasts');
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' });
  await shot(page, '12-explorar');

  // 10. Móvil
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', isMobile: true });
  const m = await mobile.newPage();
  await m.goto(`${BASE}/e/${slug}`, { waitUntil: 'networkidle' });
  await m.waitForTimeout(1500);
  await m.screenshot({ path: `${OUT}/13-movil.png` });
  log('📸 13-movil.png');
  await mobile.close();

  console.log(`\nSLUG=${slug}`);
} catch (err) {
  await page.screenshot({ path: `${OUT}/error.png`, fullPage: true }).catch(() => {});
  console.error('❌', err);
  process.exitCode = 1;
} finally {
  if (errors.length) console.log('\nErrores del navegador:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
  await browser.close();
}
