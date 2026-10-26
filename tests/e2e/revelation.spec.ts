import { expect, test, type Page } from '@playwright/test';
import { CATALOGUE } from '../../src/data/catalogue';
import { RARITIES, type Rarity } from '../../src/data/gachaConfig';
import { REVEAL_TIMING } from '../../src/data/revealConfig';
import { flipOrder, flipSchedule } from '../../src/logic/reveal';
import { GACHA, RESULTS, center } from '../../src/ui/layout';
import {
  FRESH, capture, installRng, load, loadWith, modal, rarityRoll, revealSteps, save, scriptRng, start, tap,
  waitModal,
} from './helpers';

// Scénarios de specs/004-revelation/quickstart.md, joués sur le build. Le hasard est
// scripté dans l'ordre contractuel : rareté, élément (par résultat), puis déroulé (u, v).

const T = REVEAL_TIMING;
const firstOf = (r: Rarity) => CATALOGUE.find(i => i.rarity === r)!.id;
const DIRECT = 0.9;

test.beforeEach(async ({ page }) => {
  await installRng(page);
  await start(page);
  await loadWith(page, FRESH);
});

// Tire ×1 avec le hasard donné et attend l'ouverture de la révélation.
async function pullOne(page: Page, rarity: Rarity, reveal: readonly number[]) {
  await scriptRng(page, [rarityRoll(rarity), 0, ...reveal]);
  await tap(page, GACHA.pullSingle);
  await waitModal(page, 'reveal');
}

test('un palier par rareté, puis la carte obtenue (US1, FR-003)', async ({ page }) => {
  for (const { id } of RARITIES) {
    const t0 = Date.now();
    await pullOne(page, id, [DIRECT]);
    expect(await revealSteps(page)).toBe(id);
    if (id === 'common') {
      await page.waitForTimeout(T.suspense * 0.8 - (Date.now() - t0));
      await capture(page, 'suspense-charge');
    }
    // Capture en pleine révélation du palier (relue avant merge, SC-005).
    await page.waitForTimeout(T.suspense + 250 - (Date.now() - t0));
    await capture(page, `palier-${id}`);
    await waitModal(page, 'results');
    expect(Date.now() - t0).toBeLessThan(5_500); // SC-003
    if (id === 'legendary') {
      await page.waitForTimeout(150);
      await capture(page, 'x1-carte-legendaire');
    }
    expect((await save(page))!.owned[firstOf(id)]).toBe(1);
    await tap(page, RESULTS.ok);
    expect(await modal(page)).toBeNull();
  }
});

test('montée : Rare puis Légendaire (US3, FR-011)', async ({ page }) => {
  await pullOne(page, 'legendary', [0.1]);
  expect(await revealSteps(page)).toBe('rare>legendary');
  await page.waitForTimeout(T.suspense + 250);
  await capture(page, 'montee-faux-palier');
  await page.waitForTimeout(T.fakeStep + T.transition);
  await capture(page, 'montee-vrai-palier');
  await waitModal(page, 'results');
  expect((await save(page))!.owned[firstOf('legendary')]).toBe(1);
});

test('leurre : Ultra rare ou Légendaire, puis Rare (US4, FR-012)', async ({ page }) => {
  await pullOne(page, 'rare', [0.05, 0.1]);
  expect(await revealSteps(page)).toBe('ultra>rare');
  await page.waitForTimeout(T.suspense + 250);
  await capture(page, 'leurre-ultra');
  await page.waitForTimeout(T.fakeStep + T.transition);
  await capture(page, 'leurre-retombe-rare');
  await waitModal(page, 'results');
  await tap(page, RESULTS.ok);

  await pullOne(page, 'rare', [0.05, 0.5]);
  expect(await revealSteps(page)).toBe('legendary>rare');
  await waitModal(page, 'results');
  expect((await save(page))!.owned[firstOf('rare')]).toBe(2);
});

test('×10 : palier du meilleur, puis cartes une à une, OK à la fin (US5, FR-008)', async ({ page }) => {
  // Un Rare (index 6) tremble avant de tourner ; le Légendaire (index 3) est la vedette.
  const rarities: Rarity[] = ['common', 'uncommon', 'common', 'legendary', 'common', 'common', 'rare', 'common', 'uncommon', 'common'];
  const values = rarities.flatMap(r => [rarityRoll(r), 0]);
  await scriptRng(page, [...values, DIRECT]);
  await tap(page, GACHA.pullTen);
  await waitModal(page, 'reveal');
  expect(await revealSteps(page)).toBe('legendary');
  await waitModal(page, 'flip');
  const t0 = Date.now();
  const fakeResults = rarities.map(r => ({ item: CATALOGUE.find(i => i.rarity === r)!, isNew: true, guaranteed: false, pity: false, shards: 0 }));
  const { steps, duration } = flipSchedule(fakeResults, flipOrder(fakeResults));
  const at = async (ms: number) => page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
  const rare = steps.find(s => s.rarity === 'rare')!;
  const star = steps.at(-1)!;
  await at(rare.at + rare.anticipation * 0.6);
  await capture(page, 'x10-anticipation-rare');
  await at(rare.at + rare.anticipation + rare.turn);
  await capture(page, 'x10-eclat-rare');
  await at(star.at + star.anticipation * 0.7);
  await capture(page, 'x10-vedette-coeur');
  await at(star.at + star.anticipation + star.turn * 0.8);
  await capture(page, 'x10-vedette');
  await waitModal(page, 'results');
  expect(Date.now() - t0).toBeLessThan(duration + 500);
  await page.waitForTimeout(400);
  await capture(page, 'x10-fin');
  await tap(page, RESULTS.ok);
  expect(await modal(page)).toBeNull();
});

test('passer l’animation : cartes en moins de 0,5 s, rien de changé (US2, FR-006)', async ({ page }) => {
  await tap(page, GACHA.pullTen);
  await waitModal(page, 'reveal');
  const before = await save(page);
  await page.waitForTimeout(250);
  const t0 = Date.now();
  await page.mouse.click(180, 320);
  await waitModal(page, 'results', 500);
  expect(Date.now() - t0).toBeLessThan(500); // SC-002
  expect(await save(page)).toEqual(before); // SC-004
  await page.waitForTimeout(150);
  await capture(page, 'x10-passe');
  await tap(page, RESULTS.ok);
  expect(await modal(page)).toBeNull();
});

test('appui pendant le retournement : tout se retourne, seul OK ferme', async ({ page }) => {
  await tap(page, GACHA.pullTen);
  await waitModal(page, 'flip');
  await page.mouse.click(180, 320);
  await waitModal(page, 'results', 500);
  await page.mouse.click(180, 320);
  await page.waitForTimeout(150);
  expect(await modal(page)).toBe('results');
  await tap(page, RESULTS.ok);
  expect(await modal(page)).toBeNull();
});

test('verrou : un seul tirage, l’écran de tirage ne répond pas pendant l’animation (FR-007)', async ({ page }) => {
  const { x, y } = center(GACHA.pullSingle);
  await page.mouse.dblclick(x, y);
  await waitModal(page, 'reveal');
  expect((await save(page))!.currency).toBe(8900);
  // Avant l'armement du passage (200 ms), un appui sur un bouton ne fait rien du tout.
  await page.mouse.click(center(GACHA.collection).x, center(GACHA.collection).y);
  expect(await modal(page)).toBe('reveal');
  await page.waitForTimeout(250);
  // Ensuite, il passe l'animation : jamais de tirage ni d'autre fenêtre.
  await tap(page, GACHA.pullSingle);
  expect(await modal(page)).toBe('results');
  expect((await save(page))!.currency).toBe(8900);
});

test('tirage refusé : aucune animation (FR-001)', async ({ page }) => {
  await loadWith(page, { ...FRESH, currency: 50 });
  await tap(page, GACHA.pullSingle);
  expect(await modal(page)).toBeNull();
});

test('rechargement pendant l’animation : tirage déjà sauvegardé, pas d’animation au retour', async ({ page }) => {
  await tap(page, GACHA.pullSingle);
  await waitModal(page, 'reveal');
  const during = await save(page);
  expect(during!.currency).toBe(8900);
  await load(page);
  expect(await save(page)).toEqual(during);
  expect(await modal(page)).toBeNull();
});

test('regardé jusqu’au bout avec le vrai hasard : cartes en moins de 5,5 s (SC-003)', async ({ page }) => {
  const t0 = Date.now();
  await tap(page, GACHA.pullSingle);
  await waitModal(page, 'results', 6_000);
  expect(Date.now() - t0).toBeLessThan(5_500);
  await tap(page, RESULTS.ok);
  expect(await modal(page)).toBeNull();
});
