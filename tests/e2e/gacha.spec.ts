import { expect, test, type Page } from '@playwright/test';
import { CATALOGUE } from '../../src/data/catalogue';
import { RARITIES } from '../../src/data/gachaConfig';
import {
  CONFIRM_DIALOG_H, GACHA, RATES_DIALOG_H, RESULTS, WARNING_DIALOG_H,
  center, dialogButtons, dialogRect, type Rect,
} from '../../src/ui/layout';

// Scénario de specs/001-tirage/quickstart.md, joué sur le build. Les positions viennent
// de src/ui/layout.ts : le test clique là où la scène dessine.

interface Save { version: number; currency: number; owned: Record<string, number> }
const KEY = 'gacha.save';
const shots: string[] = [];

async function capture(page: Page, name: string) {
  const path = `test-results/captures/${String(shots.length + 1).padStart(2, '0')}-${name}.png`;
  shots.push(path);
  await page.screenshot({ path });
}

async function tap(page: Page, r: Rect) {
  const { x, y } = center(r);
  await page.mouse.click(x, y);
  // Laisse Phaser traiter l'appui et redessiner.
  await page.waitForTimeout(150);
}

async function save(page: Page): Promise<Save | null> {
  const raw = await page.evaluate(k => localStorage.getItem(k), KEY);
  return raw === null ? null : (JSON.parse(raw) as Save);
}

async function load(page: Page) {
  await page.evaluate(() => delete document.body.dataset.ready);
  await page.reload();
  await page.waitForSelector('body[data-ready="gacha"]');
}

const copies = (s: Save) => Object.values(s.owned).reduce((a, b) => a + b, 0);
const rankOf = (id: string) => RARITIES.find(r => r.id === CATALOGUE.find(i => i.id === id)!.rarity)!.rank;

test('parcours complet du tirage', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await load(page);

  // 1. Premier lancement : rien de sauvegardé tant qu'on n'a pas tiré.
  expect(await save(page)).toBeNull();
  await capture(page, 'premier-lancement');

  // 2. ×1 (en double-clic : un seul tirage doit partir). Sauvegarde déjà à jour pendant
  //    que la fenêtre de résultat est ouverte (FR-011).
  const { x, y } = center(GACHA.pullSingle);
  await page.mouse.dblclick(x, y);
  await page.waitForTimeout(150);
  const afterSingle = (await save(page))!;
  expect(afterSingle.currency).toBe(8900);
  expect(copies(afterSingle)).toBe(1);
  expect(Date.now() - start).toBeLessThan(10_000); // SC-001
  await capture(page, 'resultat-x1');
  await tap(page, RESULTS.ok);

  // 3. ×10 : 900 de moins, dix exemplaires de plus, au moins un Rare ou mieux.
  await tap(page, GACHA.pullTen);
  const afterTen = (await save(page))!;
  expect(afterTen.currency).toBe(8000);
  expect(copies(afterTen)).toBe(11);
  const gained = Object.keys(afterTen.owned).filter(id => (afterTen.owned[id] ?? 0) > (afterSingle.owned[id] ?? 0));
  expect(gained.some(id => rankOf(id) >= 2)).toBe(true);
  await capture(page, 'resultat-x10');
  await tap(page, RESULTS.ok);

  // Pendant qu'aucune fenêtre n'est ouverte, un appui sur le fond ne fait rien.
  await page.mouse.click(180, 260);
  expect(await save(page)).toEqual(afterTen);

  // 4. Rechargement : tout est conservé (SC-004).
  await load(page);
  expect(await save(page)).toEqual(afterTen);
  await capture(page, 'apres-rechargement');

  // 5. Taux.
  await tap(page, GACHA.rates);
  await capture(page, 'taux');
  await tap(page, dialogButtons(dialogRect(RATES_DIALOG_H), 1)[0]!);

  // 6. Recommencer : Annuler ne change rien, Effacer remet le stock de départ.
  const [erase, cancel] = dialogButtons(dialogRect(CONFIRM_DIALOG_H), 2);
  await tap(page, GACHA.reset);
  await capture(page, 'recommencer-confirmation');
  await tap(page, cancel!);
  expect(await save(page)).toEqual(afterTen);
  await tap(page, GACHA.reset);
  await tap(page, erase!);
  expect(await save(page)).toEqual({ version: 1, currency: 9000, owned: {} });
  await capture(page, 'apres-effacement');

  // 7. Sauvegarde illisible : avertissement, partie neuve aussitôt réécrite.
  await page.evaluate(k => localStorage.setItem(k, '{cassé'), KEY);
  await load(page);
  expect(await save(page)).toEqual({ version: 1, currency: 9000, owned: {} });
  await capture(page, 'sauvegarde-illisible');
  await tap(page, dialogButtons(dialogRect(WARNING_DIALOG_H), 1)[0]!);

  // 8. Solde insuffisant : les deux tirages sont refusés.
  const poor = { version: 1, currency: 50, owned: { gribouille: 1 } };
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(poor)]);
  await load(page);
  await tap(page, GACHA.pullSingle);
  await tap(page, GACHA.pullTen);
  expect(await save(page)).toEqual(poor);
  await capture(page, 'solde-insuffisant');

  // Entre 100 et 899 : seul le ×10 est refusé.
  const mid = { version: 1, currency: 500, owned: {} };
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(mid)]);
  await load(page);
  await tap(page, GACHA.pullTen);
  expect((await save(page))!.currency).toBe(500);
  await capture(page, 'x10-indisponible');
  await tap(page, GACHA.pullSingle);
  expect((await save(page))!.currency).toBe(400);
});
