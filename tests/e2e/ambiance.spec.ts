import { expect, test, type Page } from '@playwright/test';
import { GACHA, RESULTS, center, type Rect } from '../../src/ui/layout';
import {
  FRESH, capture, installRng, load, loadWith, modal, rarityOf, rarityRoll, save, scriptRng, skipReveal, start, tap,
  waitModal,
} from './helpers';

// Écran vivant (007, révisions du 2026-11-09 : FR-013 à FR-015, FR-019, SC-007 ; et du
// 2026-11-13 : FR-021 à FR-023, SC-009).

const ORB = { x: GACHA.orb.x - 80, y: GACHA.orb.y - 80, width: 160, height: 160 };
const orbShot = (page: Page) => page.screenshot({ clip: ORB });
// Éclat de l'orbe et ses étoiles, sans le bandeau de bannière (dont le texte change aussi).
const GLOW = { x: GACHA.orb.x - 100, y: GACHA.banner.y + GACHA.banner.h + 4, width: 200, height: 130 };
const dataset = (page: Page, key: string) => page.evaluate(k => document.body.dataset[k] ?? null, key);
const clip = (r: Rect, inset = 0) => ({ x: r.x + inset, y: r.y + inset, width: r.w - 2 * inset, height: r.h - 2 * inset });

// Vrai si la zone change pendant `ms` (captures successives) : un effet périodique se voit
// forcément sur une fenêtre plus longue que sa période.
async function changes(page: Page, area: ReturnType<typeof clip>, ms: number): Promise<boolean> {
  const first = await page.screenshot({ clip: area });
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (!(await page.screenshot({ clip: area })).equals(first)) return true;
    await page.waitForTimeout(80);
  }
  return false;
}

// Bannière suivante jusqu'à `pred` (au plus un tour complet).
async function cycleUntil(page: Page, pred: (banner: string) => boolean) {
  for (let i = 0; i < 30; i++) {
    await tap(page, GACHA.bannerNext);
    if (pred((await dataset(page, 'banner'))!)) return;
  }
  throw new Error('bannière introuvable');
}

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
  // Délai voulu : le fondu de la fenêtre et le rebond du bouton « Taux » finissent d'abord.
  await page.waitForTimeout(1500);
  // Tout l'écran, plus longtemps qu'une période du reflet : ni orbe, ni étoiles, ni reflet.
  expect(await changes(page, clip({ x: 0, y: 0, w: 360, h: 640 }), 4500)).toBe(false);
});

test('un reflet passe sur les seuls tirages payables (FR-021)', async ({ page }) => {
  await loadWith(page, { ...FRESH, currency: 500 });
  expect(await dataset(page, 'glow')).toBe('single');
  // L'intérieur des boutons : le halo est autour, les étoiles du ciel dessous.
  expect(await changes(page, clip(GACHA.pullSingle, 6), 6000)).toBe(true);
  expect(await changes(page, clip(GACHA.pullTen, 6), 4500)).toBe(false);
});

test('un bouton s’écrase à l’appui, sa zone reste à sa place (FR-021)', async ({ page }) => {
  const press = async () => {
    const { x, y } = center(GACHA.collection);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(400);
    const shot = await page.screenshot({ clip: clip(GACHA.collection) });
    // Relâché hors du bouton : rien ne s'ouvre.
    await page.mouse.move(2, 2);
    await page.mouse.up();
    return shot;
  };
  const squashed = await press();
  expect(await modal(page)).toBeNull();
  // Référence : le même appui sans animation (ombre seule, FR-019).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await load(page);
  const flat = await press();
  expect(squashed.equals(flat)).toBe(false);
  // Le bouton répond toujours au même endroit, après un appui écrasé.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await load(page);
  await press();
  await tap(page, GACHA.collection);
  expect(await modal(page)).toBe('collection');
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
    // Tout l'écran, plus longtemps qu'une période du reflet (SC-009).
    expect(await changes(page, clip({ x: 0, y: 0, w: 360, h: 640 }), 4500)).toBe(false);
  });

  // Rendu fixe : les captures se comparent au pixel près, sans dépendre de l'instant.
  test('la vedette teinte l’ambiance ; la standard reste neutre (FR-023)', async ({ page }) => {
    expect(await dataset(page, 'ambienceTint')).toBe('neutral');
    const neutral = await page.screenshot({ clip: GLOW });
    await cycleUntil(page, b => b !== 'standard');
    const first = rarityOf((await dataset(page, 'banner'))!);
    expect(await dataset(page, 'ambienceTint')).toBe(first);
    const tinted = await page.screenshot({ clip: GLOW });
    expect(tinted.equals(neutral)).toBe(false);
    // Une vedette d'une autre rareté : une autre teinte.
    await cycleUntil(page, b => b !== 'standard' && rarityOf(b) !== first);
    expect(await dataset(page, 'ambienceTint')).not.toBe(first);
    expect((await page.screenshot({ clip: GLOW })).equals(tinted)).toBe(false);
    // Retour à la standard : exactement l'ambiance neutre du départ.
    await cycleUntil(page, b => b === 'standard');
    expect(await dataset(page, 'ambienceTint')).toBe('neutral');
    expect((await page.screenshot({ clip: GLOW })).equals(neutral)).toBe(true);
  });

  test('montant aussitôt exact au retour, sans défiler', async ({ page }) => {
    await pullCommon(page);
    await tap(page, RESULTS.ok);
    expect(await shown(page)).toBe((await save(page))!.currency);
  });
});
