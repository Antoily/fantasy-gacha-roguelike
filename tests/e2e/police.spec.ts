import { expect, test, type Page } from '@playwright/test';
import { FONT_FACE } from '../../src/ui/theme';
import { capture, start } from './helpers';

// Police embarquée (ADR 0008) : chargée avant le premier texte, repli sans blocage.

const FONT_URL = `**/${FONT_FACE.url}`;

// État de la police au moment exact où l'écran de tirage se déclare prêt : c'est à ce
// moment que ses textes sont créés, et Phaser ne les redessine pas quand la police arrive.
async function recordFontAtReady(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __fontAtReady?: string };
    // Sur le document lui-même : à ce stade, <html> et <body> n'existent pas encore.
    new MutationObserver(() => {
      if (document.body?.dataset.ready === 'gacha' && w.__fontAtReady === undefined) {
        w.__fontAtReady = document.body.dataset.font ?? 'aucune';
      }
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-ready'] });
  });
}
const fontAtReady = (page: Page) => page.evaluate(() => (window as unknown as { __fontAtReady?: string }).__fontAtReady);

test('la police du jeu est prête avant l’écran, même servie lentement', async ({ page }) => {
  await recordFontAtReady(page);
  // Servie avec 800 ms de retard : l'écran doit l'attendre plutôt que s'ouvrir sans elle.
  await page.route(FONT_URL, async r => {
    const res = await r.fetch();
    await new Promise(done => setTimeout(done, 800));
    await r.fulfill({ response: res });
  });
  await start(page);
  expect(await fontAtReady(page)).toBe('ready');
  // Pas document.fonts.check() : il répond vrai pour une police qu'aucune face ne déclare.
  expect(await page.evaluate(f => [...document.fonts].some(face => face.family === f && face.status === 'loaded'),
    FONT_FACE.family)).toBe(true);
});

test('police illisible (page d’accueil à sa place) : repli, sans erreur', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await recordFontAtReady(page);
  // Ce que renvoie `vite preview` pour un fichier absent : sa page d'accueil, en 200.
  await page.route(FONT_URL, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Gacha</title>' }));
  await start(page);
  expect(await fontAtReady(page)).toBe('fallback');
  await page.waitForSelector('body[data-art="ready"]');
  await capture(page, 'police-repli');
  expect(errors).toEqual([]);
});

test('police qui ne répond pas : l’écran s’ouvre quand même, en repli', async ({ page }) => {
  await recordFontAtReady(page);
  // Requête jamais servie : seul le délai du chargeur rend la main.
  await page.route(FONT_URL, () => {});
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForSelector('body[data-ready="gacha"]', { timeout: 10_000 });
  expect(await fontAtReady(page)).toBe('fallback');
});
