import type { Page } from '@playwright/test';
import { CATALOGUE } from '../../src/data/catalogue';
import { RARITIES } from '../../src/data/gachaConfig';
import { center, type Rect } from '../../src/ui/layout';

export interface Save {
  version: number; currency: number; owned: Record<string, number>; pity?: number; shards?: number;
  banner?: string; guarantees?: string[];
}
export const KEY = 'gacha.save';
export const FRESH = { version: 3, currency: 9000, owned: {}, pity: 0, shards: 0, banner: 'standard', guarantees: [] as string[] };

let shot = 0;
export async function capture(page: Page, name: string) {
  shot++;
  await page.screenshot({ path: `test-results/captures/${String(shot).padStart(2, '0')}-${name}.png` });
}

export async function tap(page: Page, r: Rect) {
  const { x, y } = center(r);
  await page.mouse.click(x, y);
  // Laisse Phaser traiter l'appui et redessiner.
  await page.waitForTimeout(150);
}

export async function save(page: Page): Promise<Save | null> {
  const raw = await page.evaluate(k => localStorage.getItem(k), KEY);
  return raw === null ? null : (JSON.parse(raw) as Save);
}

export async function load(page: Page) {
  await page.evaluate(() => delete document.body.dataset.ready);
  await page.reload();
  await page.waitForSelector('body[data-ready="gacha"]');
}

export async function start(page: Page) {
  await page.goto('/');
  await page.waitForSelector('body[data-ready="gacha"]');
}

// Écrit une sauvegarde puis recharge : l'écran repart de cet état.
export async function loadWith(page: Page, data: object) {
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(data)]);
  await load(page);
}

export const copies = (s: Save) => Object.values(s.owned).reduce((a, b) => a + b, 0);
export const rarityOf = (id: string) => CATALOGUE.find(i => i.id === id)!.rarity;
export const rankOf = (id: string) => RARITIES.find(r => r.id === rarityOf(id))!.rank;
export const allOwned = () => Object.fromEntries(CATALOGUE.map(i => [i.id, 1]));

// Fenêtre ouverte (data-modal posé par GachaScene), ou null si aucune.
export async function modal(page: Page): Promise<string | null> {
  return page.evaluate(() => document.body.dataset.modal ?? null);
}

// Hasard scripté (004, research R6) : Math.random sert d'abord la file window.__rng,
// puis retombe sur le vrai hasard. À installer avant le chargement de la page.
export async function installRng(page: Page) {
  await page.addInitScript(() => {
    const real = Math.random;
    const w = window as unknown as { __rng?: number[] };
    Math.random = () => (w.__rng && w.__rng.length > 0 ? w.__rng.shift()! : real());
  });
}

export async function scriptRng(page: Page, values: readonly number[]) {
  await page.evaluate(v => { (window as unknown as { __rng?: number[] }).__rng = [...v]; }, values);
}

// Valeur de hasard qui fait tirer `rarity` dans la table complète (milieu de son intervalle).
export function rarityRoll(rarity: string): number {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let acc = 0;
  for (const r of RARITIES) {
    if (r.id === rarity) return (acc + r.weight / 2) / total;
    acc += r.weight;
  }
  throw new Error(`rareté inconnue : ${rarity}`);
}

export async function waitModal(page: Page, name: string, timeout = 10_000) {
  await page.waitForSelector(`body[data-modal="${name}"]`, { timeout });
}

export async function revealSteps(page: Page): Promise<string | null> {
  return page.evaluate(() => document.body.dataset.reveal ?? null);
}

// Passe l'animation d'un tirage : attend que l'appui soit armé, touche, cartes affichées.
export async function skipReveal(page: Page) {
  await waitModal(page, 'reveal');
  await page.waitForTimeout(250);
  await page.mouse.click(180, 320);
  await waitModal(page, 'results');
  await page.waitForTimeout(150);
}
