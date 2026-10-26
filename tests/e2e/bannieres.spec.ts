import { expect, test, type Page } from '@playwright/test';
import { CONFIRM_DIALOG_H, GACHA, RESULTS, dialogButtons, dialogRect, ratesDialogH } from '../../src/ui/layout';
import {
  FRESH, capture, installRng, load, loadWith, modal, rarityRoll, save, scriptRng, skipReveal, start, tap, waitModal,
} from './helpers';

// Scénarios de specs/006-bannieres/quickstart.md, joués sur le build. Hasard scripté dans
// l'ordre contractuel (research R1) : rareté, [50/50], [élément], puis déroulé.

const WIN = 0.2;
const LOSE = 0.7;
const DIRECT = 0.9; // déroulé sans fausse piste

test.beforeEach(async ({ page }) => {
  await installRng(page);
  await start(page);
  await loadWith(page, FRESH);
});

const banner = (page: Page) => page.evaluate(() => document.body.dataset.banner ?? null);
const featuredLine = (page: Page) => page.evaluate(() => document.body.dataset.featuredLine ?? null);

async function pullLegendary(page: Page, rest: readonly number[]) {
  await scriptRng(page, [rarityRoll('legendary'), ...rest, DIRECT]);
  await tap(page, GACHA.pullSingle);
  await skipReveal(page);
}

test('premier lancement sur la standard, flèches en boucle, choix mémorisé (US1)', async ({ page }) => {
  expect(await banner(page)).toBe('standard');
  await capture(page, 'banniere-standard');
  await tap(page, GACHA.bannerNext);
  expect(await banner(page)).toBe('roi-barbichon');
  await tap(page, GACHA.bannerPrev);
  await tap(page, GACHA.bannerPrev);
  expect(await banner(page)).toBe('orbulle');
  await tap(page, GACHA.bannerPrev);
  expect(await banner(page)).toBe('cosmo-l-infini'); // nom le plus long du catalogue
  await capture(page, 'banniere-cosmo');
  expect((await save(page))!.banner).toBe('cosmo-l-infini');
  await load(page);
  expect(await banner(page)).toBe('cosmo-l-infini');
});

test('50/50 gagné : la vedette, sans garantie (US2-1)', async ({ page }) => {
  await tap(page, GACHA.bannerNext);
  await pullLegendary(page, [WIN]);
  const s = (await save(page))!;
  expect(s.owned['roi-barbichon']).toBe(1);
  expect(s.guarantees).toEqual([]);
});

test('50/50 perdu, puis vedette garantie (US2-2, US2-3, US3-3)', async ({ page }) => {
  await tap(page, GACHA.bannerNext);
  await pullLegendary(page, [LOSE, 0]);
  let s = (await save(page))!;
  expect(s.owned['marquise-cerise']).toBe(1);
  expect(s.guarantees).toEqual(['roi-barbichon']);
  await tap(page, RESULTS.ok);
  expect(await featuredLine(page)).toBe('Prochain Légendaire garanti\u00a0: Roi Barbichon');
  await capture(page, 'garantie-vedette-ouverte');

  await pullLegendary(page, []);
  await capture(page, 'vedette-garantie');
  s = (await save(page))!;
  expect(s.owned['roi-barbichon']).toBe(1);
  expect(s.guarantees).toEqual([]);
  await tap(page, RESULTS.ok);
  expect(await featuredLine(page)).toBe('');
});

test('la garantie reste sur sa bannière (US3-2, US3-4)', async ({ page }) => {
  await loadWith(page, { ...FRESH, banner: 'tonnerrouf', guarantees: ['roi-barbichon'] });
  // Légendaire sur Tonnerrouf, 50/50 perdu, Roi Barbichon tombe sans utiliser la garantie.
  await pullLegendary(page, [LOSE, 0]);
  const s = (await save(page))!;
  expect(s.owned['roi-barbichon']).toBe(1);
  expect([...s.guarantees!].sort()).toEqual(['roi-barbichon', 'tonnerrouf']);
  await tap(page, RESULTS.ok);
  await load(page);
  expect((await save(page))!.guarantees).toHaveLength(2);
  // Seule la garantie de la bannière affichée est annoncée (FR-015).
  await loadWith(page, { ...FRESH, banner: 'tonnerrouf', guarantees: ['roi-barbichon'] });
  expect(await featuredLine(page)).toBe('');
  await tap(page, GACHA.bannerPrev);
  await tap(page, GACHA.bannerPrev);
  expect(await featuredLine(page)).toBe('Prochain Légendaire garanti\u00a0: Roi Barbichon');
});

test('le pity des 40 est commun à toutes les bannières (US3-1)', async ({ page }) => {
  await loadWith(page, { ...FRESH, pity: 25 });
  await scriptRng(page, [rarityRoll('common'), 0, DIRECT]);
  await tap(page, GACHA.bannerNext);
  await tap(page, GACHA.pullSingle);
  await skipReveal(page);
  await tap(page, RESULTS.ok);
  await tap(page, GACHA.bannerPrev);
  expect((await save(page))!.pity).toBe(26);
  expect(await banner(page)).toBe('standard');
});

test('le tirage part sur la bannière affichée (FR-005)', async ({ page }) => {
  await loadWith(page, { ...FRESH, banner: 'orbulle' });
  await scriptRng(page, [rarityRoll('ultra'), WIN, DIRECT]);
  await tap(page, GACHA.pullSingle);
  await skipReveal(page);
  expect((await save(page))!.owned.orbulle).toBe(1);
});

test('taux de la bannière vedette (US4)', async ({ page }) => {
  await loadWith(page, { ...FRESH, banner: 'orbulle' });
  await tap(page, GACHA.rates);
  expect(await modal(page)).toBe('rates');
  await capture(page, 'taux-vedette-orbulle');
  await tap(page, dialogButtons(dialogRect(ratesDialogH(true)), 1)[0]!);
  expect(await modal(page)).toBeNull();
  await tap(page, GACHA.bannerNext);
  await tap(page, GACHA.rates);
  await tap(page, dialogButtons(dialogRect(ratesDialogH(false)), 1)[0]!);
  expect(await modal(page)).toBeNull();
});

test('sauvegarde v2 reprise sur la standard (FR-019)', async ({ page }) => {
  await loadWith(page, { version: 2, currency: 4200, owned: { orbulle: 1 }, pity: 12, shards: 30 });
  expect(await banner(page)).toBe('standard');
  expect(await modal(page)).toBeNull(); // pas d'avertissement de sauvegarde illisible
  await tap(page, GACHA.bannerNext);
  const s = (await save(page))!;
  expect(s).toMatchObject({ version: 3, currency: 4200, pity: 12, shards: 30, banner: 'roi-barbichon', guarantees: [] });
});

test('Recommencer remet la standard et efface les garanties (FR-020)', async ({ page }) => {
  await loadWith(page, { ...FRESH, banner: 'tonnerrouf', guarantees: ['tonnerrouf'] });
  await capture(page, 'garantie-tonnerrouf');
  await tap(page, GACHA.reset);
  await waitModal(page, 'confirm-reset');
  await tap(page, dialogButtons(dialogRect(CONFIRM_DIALOG_H), 2)[0]!);
  expect(await banner(page)).toBe('standard');
  expect((await save(page))!.guarantees).toEqual([]);
});

test('les flèches ne réagissent pas sous une fenêtre (US1-5)', async ({ page }) => {
  await tap(page, GACHA.rates);
  await tap(page, GACHA.bannerNext);
  expect(await modal(page)).toBe('rates');
  expect(await banner(page)).toBe('standard');
});
