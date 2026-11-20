import { expect, test, type Page } from '@playwright/test';
import { CATALOGUE } from '../../src/data/catalogue';
import { collectionEntries } from '../../src/logic/collection';
import { GACHA, SHEET, center, collectionCellRect, type Rect } from '../../src/ui/layout';
import { FRESH, capture, freeze, installManualClock, lightShares, load, loadWith, modal, start, step, tap, waitModal } from './helpers';

// Fenêtres (007, révision du 2026-11-13 : FR-024, FR-025, SC-009).

const dataset = (page: Page, key: string) => page.evaluate(k => document.body.dataset[k] ?? null, key);
const settled = (page: Page) => page.waitForFunction(() => !document.body.dataset.opening, undefined, { timeout: 10_000 });
// Durée de la dernière ouverture, en temps du jeu (dataset.clockModal → clockOpened).
const openingMs = (page: Page) => page.evaluate(() => Number(document.body.dataset.clockOpened) - Number(document.body.dataset.clockModal));
const clip = (r: Rect) => ({ x: r.x, y: r.y, width: r.w, height: r.h });
const shot = (page: Page, r: Rect) => page.screenshot({ clip: clip(r) });
// Des Communs manquants et 10 éclats : la dernière case (Gloups, Commun) est échangeable.
const STATE = { ...FRESH, owned: { gribouille: 1, 'lulu-tempete': 2 }, shards: 10 };
const cellOf = (id: string) => collectionCellRect(collectionEntries(STATE).findIndex(e => e.item.id === id));

test.describe('ouverture', () => {
  test.beforeEach(async ({ page }) => {
    await installManualClock(page);
    await start(page);
    await loadWith(page, STATE);
  });

  // Les cases arrivent en cascade et le panneau grandit autour de son centre : si leurs zones
  // suivaient le dessin, un appui au bord d'une case de la dernière rangée tomberait à côté.
  test('pendant l’ouverture, une case répond là où layout.ts la place (FR-024)', async ({ page }) => {
    await freeze(page, true);
    const c = center(GACHA.collection);
    await page.mouse.click(c.x, c.y);
    await step(page, 50);
    expect(await modal(page)).toBe('collection');
    expect(await dataset(page, 'opening')).toBe('collection');
    const last = collectionCellRect(CATALOGUE.length - 1);
    expect(collectionEntries(STATE).at(-1)!.affordable).toBe(true);
    await page.mouse.click(last.x + last.w - 4, last.y + 2);
    await step(page, 50);
    expect(await modal(page)).toBe('confirm-exchange');
    await freeze(page, false);
    // La confirmation s'ouvre à son tour, en 250 ms au plus.
    await settled(page);
    const ms = await openingMs(page);
    expect(ms).toBeGreaterThan(100);
    expect(ms).toBeLessThanOrEqual(250);
  });

  test('la collection s’ouvre en 250 ms au plus, cascade comprise (FR-024)', async ({ page }) => {
    await tap(page, GACHA.collection);
    await settled(page);
    const ms = await openingMs(page);
    expect(ms).toBeGreaterThan(150);
    expect(ms).toBeLessThanOrEqual(250);
  });
});

test.describe('mise en scène', () => {
  test.beforeEach(async ({ page }) => {
    await start(page);
    await loadWith(page, STATE);
  });

  // Le coût d'un manquant échangeable pulse ; l'illustration de la fiche flotte (FR-025).
  test('vivantes en mouvement normal, fixes en mouvement réduit (SC-009)', async ({ page }) => {
    // Deux parcours collection → fiche, chacun avec ses attentes voulues : plus que les 30 s par défaut.
    test.setTimeout(90_000);
    const cost = { ...cellOf('mirette'), x: cellOf('mirette').x + 40, w: 60 };
    const sheet = async () => {
      await tap(page, GACHA.collection);
      await waitModal(page, 'collection');
      await settled(page);
      const a = await shot(page, cost);
      await page.waitForTimeout(700);
      const costMoves = !(await shot(page, cost)).equals(a);
      await tap(page, cellOf('lulu-tempete'));
      await waitModal(page, 'fiche');
      await settled(page);
      // Le cœur de l'illustration : l'éclat d'arrivée naît à plus de 60 px du centre et s'en éloigne.
      const core = { x: SHEET.art.x + SHEET.art.w / 2 - 35, y: SHEET.art.y + SHEET.art.h / 2 - 35, w: 70, h: 70 };
      const b = await shot(page, core);
      // Délai voulu : comparer deux instants de la lévitation.
      await page.waitForTimeout(700);
      return { costMoves, artMoves: !(await shot(page, core)).equals(b) };
    };
    expect(await sheet()).toEqual({ costMoves: true, artMoves: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await load(page);
    expect(await sheet()).toEqual({ costMoves: false, artMoves: false });
    // Aucune ouverture animée : le signal n'est jamais posé.
    expect(await dataset(page, 'clockOpened')).toBeNull();
  });

  // Les silhouettes laissent voir le fond autour de la forme : la tête seule remplissait le
  // disque (dix manquants sur quatorze n'étaient qu'un disque sombre).
  test('chaque silhouette laisse voir le fond du portrait (FR-025)', async ({ page }) => {
    await loadWith(page, FRESH);
    await tap(page, GACHA.collection);
    await settled(page);
    await capture(page, 'collection-silhouettes');
    const entries = collectionEntries(FRESH);
    const shares = await lightShares(page, entries.map((_, i) => {
      const r = collectionCellRect(i);
      return { x: r.x + 22, y: r.y + r.h / 2, r: 12 };
    }));
    // Mesuré : 0,17 à 0,40 selon la forme ; la tête seule laissait 0 à 0,05 (disque plein).
    for (const share of shares) expect(share).toBeGreaterThanOrEqual(0.12);
  });
});
