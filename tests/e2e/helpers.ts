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

// Écran prêt ET illustrations prêtes (elles arrivent juste après l'écran, 007 SC-004) :
// les captures et les tests d'illustrations voient toujours le rendu final.
async function ready(page: Page) {
  await page.waitForSelector('body[data-ready="gacha"]');
  await page.waitForSelector('body[data-art="ready"]');
}

export async function load(page: Page) {
  await page.evaluate(() => {
    delete document.body.dataset.ready;
    delete document.body.dataset.art;
  });
  await page.reload();
  await ready(page);
}

export async function start(page: Page) {
  await page.goto('/');
  await ready(page);
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

// Attend la fenêtre `name`. Une présentation plein écran (007) rencontrée en chemin est
// passée d'un appui, comme le ferait le joueur : les parcours d'avant restent valables.
export async function waitModal(page: Page, name: string, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const seen = await page.waitForFunction(n => {
      const m = document.body.dataset.modal;
      return m === n || m === 'splash' ? m : null;
    }, name, { timeout: Math.max(1, deadline - Date.now()) });
    if ((await seen.jsonValue()) === name) {
      // Deux images : Phaser n'inscrit ses nouvelles zones d'appui qu'à l'image suivante,
      // un appui dans la même image que l'ouverture de la fenêtre serait perdu.
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      return;
    }
    await passSplash(page);
  }
}

// Passe une présentation : attend que l'appui soit armé, puis touche.
export async function passSplash(page: Page) {
  await armedSkip(page);
  await page.mouse.click(180, 600);
  await page.waitForTimeout(100);
}

export async function revealSteps(page: Page): Promise<string | null> {
  return page.evaluate(() => document.body.dataset.reveal ?? null);
}

// Attend que l'appui qui passe l'animation soit armé (dataset.skip), plus deux images pour
// que Phaser inscrive la zone : un délai fixe ne suffit pas sur le rendu logiciel lent de la CI.
export async function armedSkip(page: Page) {
  await page.waitForSelector('body[data-skip="armed"]');
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// Passe l'animation d'un tirage : attend que l'appui soit armé, touche, cartes affichées.
export async function skipReveal(page: Page) {
  await waitModal(page, 'reveal');
  await armedSkip(page);
  await page.mouse.click(180, 320);
  await waitModal(page, 'results');
  await page.waitForTimeout(150);
}

// Contraste (WCAG) entre le pixel le plus clair et le plus foncé d'une zone de l'écran : un
// texte recouvert par son propre bandeau, ou une lueur trop sombre sur la nuit, le fait chuter.
// Le canvas WebGL ne se lit pas (getImageData) : on décode une capture dans la page.
export async function contrastIn(page: Page, r: Rect): Promise<number> {
  const png = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  return page.evaluate(async b64 => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
    const bmp = await createImageBitmap(blob);
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
    const lin = (v: number) => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    let lo = 1, hi = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * lin(d[i]!) + 0.7152 * lin(d[i + 1]!) + 0.0722 * lin(d[i + 2]!);
      lo = Math.min(lo, l); hi = Math.max(hi, l);
    }
    return (hi + 0.05) / (lo + 0.05);
  }, png.toString('base64'));
}
