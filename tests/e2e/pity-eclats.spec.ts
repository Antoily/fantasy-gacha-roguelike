import { expect, test } from '@playwright/test';
import { SHARD_GAIN } from '../../src/data/gachaConfig';
import { exchangeableItems, initialProgression } from '../../src/logic/progression';
import {
  CONFIRM_DIALOG_H, GACHA, RATES_DIALOG_H, RESULTS, dialogButtons, dialogRect, exchangeCellRect, exchangeLayout,
} from '../../src/ui/layout';
import { FRESH, allOwned, capture, loadWith, modal, rankOf, rarityOf, save, start, tap } from './helpers';

// Scénarios de specs/002-pity-doublons/quickstart.md, joués sur le build.

test.beforeEach(async ({ page }) => {
  await start(page);
});

test('le pity force un Légendaire ou mieux au 40ᵉ tirage', async ({ page }) => {
  await loadWith(page, { ...FRESH, pity: 39 });
  await capture(page, 'pity-dernier-tirage');
  await tap(page, GACHA.pullSingle);
  const after = (await save(page))!;
  const [id] = Object.keys(after.owned);
  expect(rankOf(id!)).toBeGreaterThanOrEqual(3);
  expect(after.pity).toBe(0);
  await capture(page, 'pity-garanti');
  await tap(page, RESULTS.ok);
  await capture(page, 'pity-compteur-remis');
});

test('le compteur avance d’un tirage et la règle est dans les taux', async ({ page }) => {
  await loadWith(page, FRESH);
  await tap(page, GACHA.pullSingle);
  const after = (await save(page))!;
  const [id] = Object.keys(after.owned);
  expect(after.pity).toBe(rankOf(id!) >= 3 ? 0 : 1);
  await tap(page, RESULTS.ok);
  await capture(page, 'compteur-apres-un-tirage');
  await tap(page, GACHA.rates);
  await capture(page, 'taux-avec-pity');
  await tap(page, dialogButtons(dialogRect(RATES_DIALOG_H), 1)[0]!);
});

test('chaque doublon rapporte les éclats de sa rareté', async ({ page }) => {
  const before = { ...FRESH, owned: allOwned(), shards: 3 };
  await loadWith(page, before);
  await tap(page, GACHA.pullTen);
  const after = (await save(page))!;
  let expected = before.shards;
  for (const [id, n] of Object.entries(after.owned)) expected += (n - 1) * SHARD_GAIN[rarityOf(id)];
  expect(after.shards).toBe(expected);
  expect(after.shards).toBeGreaterThanOrEqual(before.shards + 10);
  await capture(page, 'doublons-eclats');
});

test('échanger des éclats contre un élément manquant, en 3 appuis', async ({ page }) => {
  const owned = allOwned();
  delete owned.tonnerrouf;
  const before = { ...FRESH, currency: 4200, owned, pity: 12, shards: 150 };
  await loadWith(page, before);
  await tap(page, GACHA.exchange);
  expect(await modal(page)).toBe('exchange');
  await capture(page, 'echange-un-manquant');
  await tap(page, exchangeCellRect(0));
  expect(await modal(page)).toBe('confirm-exchange');
  await capture(page, 'echange-confirmation');
  await tap(page, dialogButtons(dialogRect(CONFIRM_DIALOG_H), 2)[0]!);
  expect(await modal(page)).toBe('results');
  expect(await save(page)).toEqual({ ...before, owned: { ...owned, tonnerrouf: 1 }, shards: 0 });
  await capture(page, 'echange-obtenu');
});

test('un échange trop cher est grisé et ne fait rien', async ({ page }) => {
  const owned = allOwned();
  delete owned.tonnerrouf;
  const before = { ...FRESH, owned, shards: 10 };
  await loadWith(page, before);
  await tap(page, GACHA.exchange);
  await tap(page, exchangeCellRect(0));
  // La case grisée ne réagit pas : on reste sur la liste, sans confirmation.
  expect(await modal(page)).toBe('exchange');
  expect(await save(page)).toEqual(before);
  await capture(page, 'echange-trop-cher');
});

test('la liste d’échange d’une partie neuve tient à l’écran, les plus rares d’abord', async ({ page }) => {
  await loadWith(page, { ...FRESH, shards: 60 });
  await tap(page, GACHA.exchange);
  expect(exchangeableItems({ ...initialProgression(), shards: 60 })).toHaveLength(20);
  await capture(page, 'echange-liste-complete');
  // Un Commun (10 éclats) est échangeable : la dernière case l'est forcément.
  await tap(page, exchangeCellRect(19));
  expect(await modal(page)).toBe('confirm-exchange');
  await tap(page, dialogButtons(dialogRect(CONFIRM_DIALOG_H), 2)[1]!);
  // Annuler ramène à la liste, sans rien dépenser.
  expect(await modal(page)).toBe('exchange');
  expect((await save(page))!.shards).toBe(60);
  await capture(page, 'echange-annule');
});

test('une sauvegarde de la version 001 est reprise et passe en version 2', async ({ page }) => {
  await loadWith(page, { version: 1, currency: 4200, owned: { gribouille: 3 } });
  await tap(page, GACHA.pullSingle);
  const after = (await save(page))!;
  expect(after.version).toBe(2);
  expect(after.currency).toBe(4100);
  expect(after.owned.gribouille).toBeGreaterThanOrEqual(3);
  expect(after.pity).toBeLessThanOrEqual(1);
});

test('quand tout est possédé, la liste d’échange le dit', async ({ page }) => {
  await loadWith(page, { ...FRESH, owned: allOwned(), shards: 500 });
  await tap(page, GACHA.exchange);
  await capture(page, 'echange-tout-possede');
  await tap(page, exchangeLayout(0).close);
  expect(await modal(page)).toBeNull();
  expect((await save(page))!.shards).toBe(500);
});
