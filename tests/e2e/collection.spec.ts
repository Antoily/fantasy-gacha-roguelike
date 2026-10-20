import { expect, test } from '@playwright/test';
import { CATALOGUE } from '../../src/data/catalogue';
import { collectionEntries } from '../../src/logic/collection';
import { COLLECTION, GACHA, collectionCellRect } from '../../src/ui/layout';
import { FRESH, allOwned, capture, loadWith, modal, save, start, tap } from './helpers';

// Scénarios de specs/003-collection/quickstart.md, joués sur le build.

test.beforeEach(async ({ page }) => {
  await start(page);
});

test('partie neuve : tout le catalogue apparaît comme manquant', async ({ page }) => {
  await loadWith(page, FRESH);
  await tap(page, GACHA.collection); // 1 appui (SC-001)
  expect(await modal(page)).toBe('collection');
  await capture(page, 'collection-partie-neuve');
});

test('les possédés sont affichés avec leurs exemplaires, et un appui dessus ne fait rien', async ({ page }) => {
  const state = { ...FRESH, owned: { gribouille: 3, orbulle: 1, 'lulu-tempete': 12 }, shards: 60 };
  await loadWith(page, state);
  await tap(page, GACHA.collection);
  await capture(page, 'collection-en-cours');
  const p = { ...state, owned: state.owned };
  for (const id of Object.keys(state.owned)) {
    await tap(page, collectionCellRect(collectionEntries(p).findIndex(e => e.item.id === id)));
    expect(await modal(page)).toBe('collection');
  }
  expect(await save(page)).toEqual(state);
});

test('collection complète : félicitations, rien à échanger', async ({ page }) => {
  const owned = Object.fromEntries(CATALOGUE.map((i, n) => [i.id, n === 0 ? 120 : 1]));
  await loadWith(page, { ...FRESH, owned, shards: 999 });
  await tap(page, GACHA.collection);
  await capture(page, 'collection-complete');
  await tap(page, collectionCellRect(0));
  expect(await modal(page)).toBe('collection');
});

test('fermer ramène à l’écran de tirage sans rien modifier', async ({ page }) => {
  const state = { ...FRESH, owned: allOwned(), shards: 40, pity: 7 };
  await loadWith(page, state);
  await tap(page, GACHA.collection);
  await tap(page, COLLECTION.close);
  expect(await modal(page)).toBeNull();
  expect(await save(page)).toEqual(state);
});
