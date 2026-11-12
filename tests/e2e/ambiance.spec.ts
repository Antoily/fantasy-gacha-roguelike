import { expect, test, type Page } from '@playwright/test';
import { GACHA, RESULTS } from '../../src/ui/layout';
import {
  FRESH, capture, installRng, loadWith, modal, rarityRoll, save, scriptRng, skipReveal, start, tap, waitModal,
} from './helpers';

// Écran vivant (007, révision du 2026-11-09 : FR-013 à FR-015, FR-019, SC-007).

const ORB = { x: GACHA.orb.x - 80, y: GACHA.orb.y - 80, width: 160, height: 160 };
const orbShot = (page: Page) => page.screenshot({ clip: ORB });
const dataset = (page: Page, key: string) => page.evaluate(k => document.body.dataset[k] ?? null, key);

test.beforeEach(async ({ page }) => {
  await installRng(page);
  await start(page);
  await loadWith(page, FRESH);
});

test('au repos, l’orbe et le ciel bougent (FR-013, SC-007)', async ({ page }) => {
  expect(await dataset(page, 'motion')).toBe('full');
  const a = await orbShot(page);
  // Délai voulu : on mesure que le temps qui passe change l'image.
  await page.waitForTimeout(1000);
  expect((await orbShot(page)).equals(a)).toBe(false);
  await capture(page, 'ecran-vivant');
});

test('sous une fenêtre, l’ambiance se tait', async ({ page }) => {
  await tap(page, GACHA.rates);
  expect(await modal(page)).toBe('rates');
  const a = await orbShot(page);
  await page.waitForTimeout(1000);
  expect((await orbShot(page)).equals(a)).toBe(true);
});

test('halo sur les seuls tirages payables (FR-014)', async ({ page }) => {
  expect(await dataset(page, 'glow')).toBe('single ten');
  await loadWith(page, { ...FRESH, currency: 500 });
  expect(await dataset(page, 'glow')).toBe('single');
  await loadWith(page, { ...FRESH, currency: 50 });
  expect(await dataset(page, 'glow')).toBe('');
});

const shown = (page: Page) => page.evaluate(() => Number(document.body.dataset.shownCurrency));

// Un Commun, révélation passée : rien d'aléatoire dans le parcours.
async function pullCommon(page: Page) {
  await scriptRng(page, [rarityRoll('common'), 0]);
  await tap(page, GACHA.pullSingle);
  await skipReveal(page);
  await waitModal(page, 'results');
}

test('le solde défile au retour sur l’écran, jusqu’à la valeur exacte (FR-015)', async ({ page }) => {
  await pullCommon(page);
  // Sous la fenêtre, l'ancien montant reste : le joueur verra le défilement.
  expect(await shown(page)).toBe(FRESH.currency);
  await tap(page, RESULTS.ok);
  const target = (await save(page))!.currency;
  expect(target).toBeLessThan(FRESH.currency);
  await page.waitForFunction(t => Number(document.body.dataset.shownCurrency) === t, target);
});

test.describe('réduire les animations (FR-019)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('écran fixe, halo toujours là', async ({ page }) => {
    expect(await dataset(page, 'motion')).toBe('reduced');
    expect(await dataset(page, 'glow')).toBe('single ten');
    const a = await orbShot(page);
    await page.waitForTimeout(1000);
    expect((await orbShot(page)).equals(a)).toBe(true);
  });

  test('montant aussitôt exact au retour, sans défiler', async ({ page }) => {
    await pullCommon(page);
    await tap(page, RESULTS.ok);
    expect(await shown(page)).toBe((await save(page))!.currency);
  });
});
