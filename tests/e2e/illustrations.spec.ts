import { expect, test, type Page } from '@playwright/test';
import { CATALOGUE } from '../../src/data/catalogue';
import type { Rarity } from '../../src/data/gachaConfig';
import { GACHA, RESULTS, SPLASH, dialogButtons, dialogRect, ratesDialogH } from '../../src/ui/layout';
import {
  FRESH, armedSkip, capture, installRng, load, loadWith, modal, passSplash, rarityRoll, scriptRng, start, tap, waitModal,
} from './helpers';

// Scénarios de specs/007-illustrations/quickstart.md, joués sur le build. Hasard scripté
// dans l'ordre contractuel : rareté, élément (par résultat), puis déroulé.

const DIRECT = 0.9;
const of = (r: Rarity) => CATALOGUE.filter(i => i.rarity === r);
const splashId = (page: Page) => page.evaluate(() => document.body.dataset.splash ?? null);
const commons = (n: number) => Array.from({ length: n }, () => [rarityRoll('common'), 0]).flat();

test.beforeEach(async ({ page }) => {
  await installRng(page);
  await start(page);
  await loadWith(page, FRESH);
});

test('écran habillé, toutes les illustrations chargées (US4, SC-001)', async ({ page }) => {
  expect(await page.evaluate(() => document.body.dataset.artMissing ?? null)).toBeNull();
  await capture(page, 'ecran-habille');
  await tap(page, GACHA.rates);
  await capture(page, 'taux-emblemes');
});

test('×1 Légendaire : présentation armée à 400 ms, puis la carte (US2, FR-003)', async ({ page }) => {
  await scriptRng(page, [rarityRoll('legendary'), 0, DIRECT]);
  await tap(page, GACHA.pullSingle);
  await page.waitForSelector('body[data-modal="splash"]', { timeout: 8_000 });
  expect(await splashId(page)).toBe(of('legendary')[0]!.id);
  // Trop tôt : l'appui ne ferme rien.
  await page.mouse.click(180, 600);
  await page.waitForTimeout(150);
  expect(await modal(page)).toBe('splash');
  await page.waitForTimeout(SPLASH.armMs);
  await capture(page, 'presentation-legendaire');
  await page.mouse.click(180, 600);
  await page.waitForSelector('body[data-modal="results"]', { timeout: 1_000 });
  expect(await splashId(page)).toBeNull();
  await page.waitForTimeout(300);
  await capture(page, 'x1-carte-illustree');
});

test('passer la révélation d’un Ultra rare : présenté quand même (FR-003)', async ({ page }) => {
  await scriptRng(page, [rarityRoll('ultra'), 0, DIRECT]);
  await tap(page, GACHA.pullSingle);
  await waitModal(page, 'reveal');
  await armedSkip(page);
  await page.mouse.click(180, 320);
  await page.waitForSelector('body[data-modal="splash"]', { timeout: 2_000 });
  expect(await splashId(page)).toBe(of('ultra')[0]!.id);
  await page.waitForTimeout(SPLASH.armMs + 200);
  await capture(page, 'presentation-ultra');
});

test('×10 avec deux Légendaires : deux présentations dans l’ordre de retournement (FR-003)', async ({ page }) => {
  const rarities: Rarity[] = ['common', 'legendary', 'common', 'common', 'common', 'common', 'legendary', 'common', 'common', 'common'];
  // Le second Légendaire est un autre élément (deuxième de sa rareté) : la vedette, retournée en dernier.
  const values = rarities.flatMap((r, i) => [rarityRoll(r), i === 6 ? 0.5 : 0]);
  await scriptRng(page, [...values, DIRECT]);
  await tap(page, GACHA.pullTen);
  await page.waitForSelector('body[data-modal="splash"]', { timeout: 15_000 });
  expect(await splashId(page)).toBe(of('legendary')[0]!.id);
  await passSplash(page);
  await page.waitForFunction(id => document.body.dataset.splash === id, of('legendary')[1]!.id);
  await passSplash(page);
  expect(await modal(page)).toBe('results');
  await page.waitForTimeout(200);
  await capture(page, 'x10-bustes');
  await tap(page, RESULTS.ok);
  expect(await modal(page)).toBeNull();
});

test('×10 sans Légendaire : dos illustrés, bustes, aucune présentation (US1, FR-002)', async ({ page }) => {
  await scriptRng(page, [...commons(10), DIRECT]);
  await tap(page, GACHA.pullTen);
  await waitModal(page, 'flip');
  await page.waitForTimeout(120);
  await capture(page, 'x10-dos-illustres');
  await page.waitForSelector('body[data-modal="results"]', { timeout: 8_000 });
  await page.waitForTimeout(600);
  expect(await modal(page)).toBe('results');
  await capture(page, 'x10-sans-presentation');
});

test('collection : portraits des possédés, silhouettes des manquants (US3, FR-004)', async ({ page }) => {
  await loadWith(page, { ...FRESH, owned: { gribouille: 2, 'professeur-fizz': 1, orbulle: 1 }, shards: 60 });
  await tap(page, GACHA.collection);
  expect(await modal(page)).toBe('collection');
  await capture(page, 'collection-illustree');
});

test('bannière vedette : portrait dans le bandeau (FR-005)', async ({ page }) => {
  await tap(page, GACHA.bannerNext);
  await capture(page, 'banniere-vedette-portrait');
});

test('illustration manquante : pastille en repli, sans erreur (FR-010)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/art/characters/gloups.svg', r => r.fulfill({ status: 404, body: '' }));
  await load(page);
  expect(await page.evaluate(() => document.body.dataset.artMissing)).toBe('gloups');
  // Gloups est le sixième Commun : une valeur d'élément de 0,9 le désigne.
  await scriptRng(page, [rarityRoll('common'), 0.9, DIRECT]);
  await tap(page, GACHA.pullSingle);
  await waitModal(page, 'results');
  await page.waitForTimeout(300);
  await capture(page, 'repli-pastille');
  expect(errors).toEqual([]);
});

test('écran prêt en moins de 3 s (SC-004)', async ({ page }) => {
  await page.evaluate(() => {
    delete document.body.dataset.ready;
    delete document.body.dataset.art;
  });
  const t0 = Date.now();
  await page.reload();
  await page.waitForSelector('body[data-ready="gacha"]');
  expect(Date.now() - t0).toBeLessThan(3_000);
  // Les illustrations suivent avant qu'un tirage ait le temps de finir sa révélation.
  await page.waitForSelector('body[data-art="ready"]', { timeout: 3_000 });
});

test('densité 2 : canvas ×2, appuis aux mêmes endroits (FR-009, SC-006)', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await installRng(page);
  await start(page);
  await loadWith(page, FRESH);
  expect(await page.evaluate(() => document.querySelector('canvas')!.width)).toBe(720);
  await capture(page, 'densite-2-ecran');
  // Une fenêtre légère plutôt qu'un tirage : le rendu logiciel ×4 de la CI est lent.
  await tap(page, GACHA.rates);
  await waitModal(page, 'rates', 5_000);
  await capture(page, 'densite-2-taux');
  await tap(page, dialogButtons(dialogRect(ratesDialogH(false)), 1)[0]!);
  await page.waitForFunction(() => !document.body.dataset.modal, undefined, { timeout: 5_000 });
  await context.close();
});
