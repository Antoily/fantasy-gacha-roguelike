import { expect, test, type Page } from '@playwright/test';
import { CATALOGUE } from '../../src/data/catalogue';
import { collectionEntries } from '../../src/logic/collection';
import type { Progression } from '../../src/logic/progression';
import { COLLECTION, CONFIRM_DIALOG_H, GACHA, SHEET, collectionCellRect, dialogButtons, dialogRect } from '../../src/ui/layout';
import { FRESH, allOwned, capture, loadWith, modal, save, start, tap, waitModal } from './helpers';

// Scénarios de specs/003-collection/quickstart.md, joués sur le build.

test.beforeEach(async ({ page }) => {
  await start(page);
});

const fiche = (page: Page) => page.evaluate(() => document.body.dataset.fiche ?? null);
const cellOf = (p: Progression, id: string) => collectionCellRect(collectionEntries(p).findIndex(e => e.item.id === id));

test('partie neuve : tout le catalogue apparaît comme manquant', async ({ page }) => {
  await loadWith(page, FRESH);
  await tap(page, GACHA.collection); // 1 appui (SC-001)
  expect(await modal(page)).toBe('collection');
  await capture(page, 'collection-partie-neuve');
});

// Révision du 2026-11-08 (US5, FR-014) : un appui sur un possédé ne fait plus rien, il le montre en grand.
test('un appui sur un possédé ouvre sa fiche, Retour ramène à la collection', async ({ page }) => {
  const state = { ...FRESH, owned: { gribouille: 3, orbulle: 1, 'lulu-tempete': 12 }, shards: 60 };
  await loadWith(page, state);
  await tap(page, GACHA.collection);
  await capture(page, 'collection-en-cours');
  for (const id of Object.keys(state.owned)) {
    await tap(page, cellOf(state, id)); // 1 appui (SC-006)
    await waitModal(page, 'fiche');
    expect(await fiche(page)).toBe(id);
    if (id !== 'orbulle') await capture(page, `fiche-${id}`);
    await tap(page, SHEET.back); // 1 appui pour revenir
    await waitModal(page, 'collection');
    expect(await fiche(page)).toBeNull();
  }
  // Ni la collection ni les fiches ne modifient la progression (FR-009).
  expect(await save(page)).toEqual(state);
});

test('un manquant n’ouvre pas de fiche : l’échange s’il est abordable, sinon rien (US5-3)', async ({ page }) => {
  const state = { ...FRESH, owned: { gribouille: 1 }, shards: 10 };
  await loadWith(page, state);
  await tap(page, GACHA.collection);
  // Mirette (Commun, 10 éclats) : la confirmation d'échange, pas la fiche.
  await tap(page, cellOf(state, 'mirette'));
  expect(await modal(page)).toBe('confirm-exchange');
  expect(await fiche(page)).toBeNull();
  await tap(page, dialogButtons(dialogRect(CONFIRM_DIALOG_H), 2)[1]!);
  await waitModal(page, 'collection');
  // Orbulle (Ultra rare, 300 éclats) : trop cher, rien ne s'ouvre.
  await tap(page, cellOf(state, 'orbulle'));
  expect(await modal(page)).toBe('collection');
  expect(await fiche(page)).toBeNull();
  expect(await save(page)).toEqual(state);
});

test('collection complète : félicitations, rien à échanger', async ({ page }) => {
  const owned = Object.fromEntries(CATALOGUE.map((i, n) => [i.id, n === 0 ? 120 : 1]));
  await loadWith(page, { ...FRESH, owned, shards: 999 });
  await tap(page, GACHA.collection);
  await capture(page, 'collection-complete');
  // Rien à échanger : la première case (un Ultra rare) ouvre sa fiche, ×120 compris.
  await tap(page, collectionCellRect(0));
  await waitModal(page, 'fiche');
  expect(await fiche(page)).toBe(collectionEntries({ ...FRESH, owned, shards: 999 })[0]!.item.id);
  await capture(page, 'fiche-ultra-rare');
});

test('fermer ramène à l’écran de tirage sans rien modifier', async ({ page }) => {
  const state = { ...FRESH, owned: allOwned(), shards: 40, pity: 7 };
  await loadWith(page, state);
  await tap(page, GACHA.collection);
  await tap(page, COLLECTION.close);
  expect(await modal(page)).toBeNull();
  expect(await save(page)).toEqual(state);
});
