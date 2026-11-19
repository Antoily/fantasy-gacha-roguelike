import { expect, test, type Page } from '@playwright/test';
import { CATALOGUE } from '../../src/data/catalogue';
import type { Rarity } from '../../src/data/gachaConfig';
import { collectionEntries } from '../../src/logic/collection';
import { GACHA, RESULTS, SPLASH, SPLASH_TIMING, collectionCellRect, dialogButtons, dialogRect, ratesDialogH } from '../../src/ui/layout';
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

// Relève dans la page les instants exacts de l'ouverture de la présentation, de ses phases
// (silhouette, puis couleur après l'éclair) et de l'armement : un appui chronométré depuis
// le test arrive trop tard sur le rendu lent de la CI.
interface SplashLog { open?: number; colored?: number; armed?: number; phases: string[] }
async function watchSplash(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __splash: SplashLog };
    w.__splash = { phases: [] };
    new MutationObserver(() => {
      const d = document.body.dataset;
      if (d.modal !== 'splash') return;
      const log = w.__splash;
      log.open ??= performance.now();
      if (d.splashPhase && log.phases.at(-1) !== d.splashPhase) log.phases.push(d.splashPhase);
      if (d.splashPhase === 'color') log.colored ??= performance.now();
      if (d.skip === 'armed') log.armed ??= performance.now();
    }).observe(document.body, { attributes: true, attributeFilter: ['data-modal', 'data-skip', 'data-splash-phase'] });
  });
}
const splashLog = (page: Page) => page.evaluate(() => (window as unknown as { __splash: Required<SplashLog> }).__splash);
const SPLASH_ART = { x: SPLASH.art.x - 150, y: SPLASH.art.y - 180, width: 300, height: 360 };

test('×1 Légendaire : silhouette, éclair, couleur, appui armé après l’éclair, puis la carte (FR-003, FR-020)', async ({ page }) => {
  await watchSplash(page);
  await scriptRng(page, [rarityRoll('legendary'), 0, DIRECT]);
  await tap(page, GACHA.pullSingle);
  await page.waitForSelector('body[data-modal="splash"]', { timeout: 8_000 });
  expect(await splashId(page)).toBe(of('legendary')[0]!.id);
  await armedSkip(page);
  const { open, colored, armed, phases } = await splashLog(page);
  // L'élément entre en silhouette ; l'éclair le révèle en couleur après SPLASH_TIMING.silhouette.
  expect(phases).toEqual(['silhouette', 'color']);
  expect(colored - open).toBeGreaterThanOrEqual(SPLASH_TIMING.silhouette * 0.8);
  // Un appui n'est accepté qu'une fois l'illustration révélée (cas limite de la spec).
  expect(armed - open).toBeGreaterThanOrEqual(SPLASH.armMs * 0.8);
  expect(armed).toBeGreaterThanOrEqual(colored);
  // Au repos, la présentation reste vivante : rayons qui tournent, illustration qui respire.
  const a = await page.screenshot({ clip: SPLASH_ART });
  // Délai voulu : on mesure que le temps qui passe change l'image.
  await page.waitForTimeout(1000);
  expect((await page.screenshot({ clip: SPLASH_ART })).equals(a)).toBe(false);
  await capture(page, 'presentation-legendaire');
  await page.mouse.click(180, 600);
  await page.waitForSelector('body[data-modal="results"]', { timeout: 2_000 });
  expect(await splashId(page)).toBeNull();
  expect(await page.evaluate(() => document.body.dataset.splashPhase ?? null)).toBeNull();
  // Fin de la sortie en fondu de la présentation, par-dessus la carte.
  await page.waitForTimeout(SPLASH_TIMING.exit + 300);
  await capture(page, 'x1-carte-illustree');
});

test.describe('réduire les animations', () => {
  test.use({ reducedMotion: 'reduce' });

  test('présentation fixe, d’emblée en couleur, appui toujours armé après le délai (SC-009)', async ({ page }) => {
    expect(await page.evaluate(() => document.body.dataset.motion)).toBe('reduced');
    await watchSplash(page);
    await scriptRng(page, [rarityRoll('legendary'), 0, DIRECT]);
    await tap(page, GACHA.pullSingle);
    await page.waitForSelector('body[data-modal="splash"]', { timeout: 8_000 });
    await armedSkip(page);
    const { open, armed, phases } = await splashLog(page);
    expect(phases).toEqual(['color']);
    expect(armed - open).toBeGreaterThanOrEqual(SPLASH.armMs * 0.8);
    const a = await page.screenshot();
    await page.waitForTimeout(1000);
    expect((await page.screenshot()).equals(a)).toBe(true);
    await capture(page, 'presentation-fixe');
    // La présentation se ferme d'un coup : la carte est seule à l'écran.
    await page.mouse.click(180, 600);
    await page.waitForSelector('body[data-modal="results"]', { timeout: 2_000 });
  });
});

test('passer la révélation d’un Ultra rare : présenté quand même (FR-003)', async ({ page }) => {
  await scriptRng(page, [rarityRoll('ultra'), 0, DIRECT]);
  await tap(page, GACHA.pullSingle);
  await waitModal(page, 'reveal');
  await armedSkip(page);
  await page.mouse.click(180, 320);
  await page.waitForSelector('body[data-modal="splash"]', { timeout: 2_000 });
  expect(await splashId(page)).toBe(of('ultra')[0]!.id);
  await armedSkip(page);
  // Fin de la mise en scène : nom, emblème, ruban et badge posés.
  await page.waitForTimeout(SPLASH_TIMING.badge + SPLASH_TIMING.badgePop);
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
  // Les résultats répondent tout de suite, pendant que la présentation s'efface par-dessus
  // (sortie de SPLASH_TIMING.exit) : elle ne doit plus capter les appuis.
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
  // Sa fiche, dans la collection, se replie de même (003, révision du 2026-11-08).
  await tap(page, RESULTS.ok);
  await tap(page, GACHA.collection);
  await tap(page, collectionCellRect(collectionEntries(FRESH).findIndex(e => e.item.id === 'gloups')));
  await waitModal(page, 'fiche');
  await capture(page, 'repli-fiche');
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
