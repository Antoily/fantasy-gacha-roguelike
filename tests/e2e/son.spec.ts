import { expect, test, type Page } from '@playwright/test';
import type { Rarity } from '../../src/data/gachaConfig';
import { REVEAL_TIMING } from '../../src/data/revealConfig';
import { SETTINGS_KEY } from '../../src/logic/settings';
import { CONFIRM_DIALOG_H, GACHA, RESULTS, dialogButtons, dialogRect } from '../../src/ui/layout';
import { FRESH, capture, installRng, load, loadWith, rarityRoll, scriptRng, start, tap, waitModal } from './helpers';

// Scénarios de specs/005-son/quickstart.md. La CI n'entend rien : on lit le journal des
// sons émis (dataset.sounds) et l'état du bouton (dataset.muted).

const T = REVEAL_TIMING;
const DIRECT = 0.9;

const sounds = (page: Page) => page.evaluate(() => document.body.dataset.sounds ?? '');
const muted = (page: Page) => page.evaluate(() => document.body.dataset.muted);
const settings = (page: Page) => page.evaluate(k => localStorage.getItem(k), SETTINGS_KEY);

test.beforeEach(async ({ page }) => {
  await installRng(page);
  await start(page);
  await page.evaluate(k => localStorage.removeItem(k), SETTINGS_KEY);
  await loadWith(page, FRESH);
});

// Tire ×1 avec le hasard donné et attend les cartes (animation regardée jusqu'au bout).
async function pullOne(page: Page, rarity: Rarity, reveal: readonly number[]) {
  await scriptRng(page, [rarityRoll(rarity), 0, ...reveal]);
  await tap(page, GACHA.pullSingle);
  await waitModal(page, 'results');
}

test('palier direct : suspense puis le son du palier (FR-001)', async ({ page }) => {
  await pullOne(page, 'ultra', [DIRECT]);
  expect(await sounds(page)).toBe('suspense tier:ultra');
  await tap(page, RESULTS.ok);
  await pullOne(page, 'common', [DIRECT]);
  expect(await sounds(page)).toBe('suspense tier:common');
});

test('montée : son de montée entre les deux paliers (FR-002)', async ({ page }) => {
  await pullOne(page, 'legendary', [0.1]);
  expect(await sounds(page)).toBe('suspense tier:rare rise tier:legendary');
});

test('leurre : le rire diabolique à la retombée (FR-003)', async ({ page }) => {
  await pullOne(page, 'rare', [0.05, 0.5]);
  expect(await sounds(page)).toBe('suspense tier:legendary laugh tier:rare');
  await tap(page, RESULTS.ok);
  // Même rareté sans leurre : pas de rire.
  await pullOne(page, 'rare', [DIRECT]);
  expect(await sounds(page)).toBe('suspense tier:rare');
});

test('×10 : un bruit par carte, la vedette en dernier (FR-004)', async ({ page }) => {
  const values: number[] = [];
  for (let i = 0; i < 10; i++) values.push(rarityRoll(i === 3 ? 'legendary' : 'common'), 0);
  await scriptRng(page, [...values, DIRECT]);
  await tap(page, GACHA.pullTen);
  await waitModal(page, 'results');
  await page.waitForTimeout(100);
  expect(await sounds(page)).toBe(['suspense', 'tier:legendary', ...Array<string>(9).fill('card'), 'star'].join(' '));
});

test('passer : plus aucun son après l’appui (FR-005, SC-003)', async ({ page }) => {
  await scriptRng(page, [rarityRoll('ultra'), 0, DIRECT]);
  await tap(page, GACHA.pullSingle);
  await waitModal(page, 'reveal');
  await page.waitForTimeout(250);
  await page.mouse.click(180, 320);
  await waitModal(page, 'results');
  expect(await sounds(page)).toBe('suspense');
  // La sirène du suspense sonnait encore : elle est coupée net.
  expect(await page.evaluate(() => document.body.dataset.soundsLive)).toBe('0');
  await page.waitForTimeout(T.suspense + T.final.ultra);
  expect(await sounds(page)).toBe('suspense');
});

test('couper le son : silence, mémorisé, survit à « Recommencer » (FR-006, FR-007)', async ({ page }) => {
  expect(await muted(page)).toBe('0');
  await capture(page, 'son-actif');
  await tap(page, GACHA.mute);
  expect(await muted(page)).toBe('1');
  expect(JSON.parse((await settings(page))!)).toEqual({ muted: true });
  await capture(page, 'son-coupe');

  await pullOne(page, 'rare', [0.05, 0.1]);
  expect(await sounds(page)).toBe('');
  await tap(page, RESULTS.ok);

  await load(page);
  expect(await muted(page)).toBe('1');
  await tap(page, GACHA.reset);
  await tap(page, dialogButtons(dialogRect(CONFIRM_DIALOG_H), 2)[0]!);
  await load(page);
  expect(await muted(page)).toBe('1');

  await tap(page, GACHA.mute);
  expect(await muted(page)).toBe('0');
  await pullOne(page, 'common', [DIRECT]);
  expect(await sounds(page)).toBe('suspense tier:common');
});

test('le bouton son ne réagit pas pendant l’animation', async ({ page }) => {
  await tap(page, GACHA.pullSingle);
  await waitModal(page, 'reveal');
  await page.mouse.click(GACHA.mute.x + 22, GACHA.mute.y + 20);
  expect(await muted(page)).toBe('0');
});

test('le fichier du rire est servi par le build (FR-010)', async ({ page }) => {
  const laugh = page.waitForResponse(r => /sounds\/rire-diabolique\.(ogg|mp3)$/.test(r.url()));
  await load(page);
  const response = await laugh;
  expect(response.status()).toBe(200);
  expect((await response.body()).byteLength).toBeGreaterThan(10_000);
});

test('un son qui plante ne perturbe pas le jeu (FR-008)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    AudioContext.prototype.createOscillator = () => { throw new Error('audio cassé'); };
  });
  await load(page);
  await pullOne(page, 'ultra', [DIRECT]);
  expect(await sounds(page)).toBe('suspense tier:ultra');
  await tap(page, RESULTS.ok);
  expect(errors).toEqual([]);
});

test('sans audio, le jeu démarre et le tirage va jusqu’aux cartes (FR-008)', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.AudioContext;
    delete w.webkitAudioContext;
  });
  await load(page);
  await tap(page, GACHA.pullSingle);
  await waitModal(page, 'results');
  await tap(page, RESULTS.ok);
});
