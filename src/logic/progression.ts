import { CATALOGUE, type Item } from '../data/catalogue';
import { GACHA_CONFIG, RARITIES, SHARD_COST } from '../data/gachaConfig';
import { pullSingle, pullTen, type Owned, type PullResult } from './gacha';
import type { Rng } from './rng';

export interface Progression {
  readonly currency: number;
  // Absent = non possédé ; sinon nombre d'exemplaires (≥ 1).
  readonly owned: Owned;
  // Résultats consécutifs sans Légendaire ou mieux (0 à pityThreshold − 1).
  readonly pity: number;
  // Solde d'éclats, gagnés sur les doublons.
  readonly shards: number;
}

export type PullCount = 1 | 10;

export type PullOutcome =
  | { readonly ok: true; readonly progression: Progression; readonly results: PullResult[] }
  | { readonly ok: false; readonly reason: 'insufficient-funds' };

export type ExchangeOutcome =
  | { readonly ok: true; readonly progression: Progression; readonly item: Item }
  | { readonly ok: false; readonly reason: 'already-owned' | 'insufficient-shards' | 'unknown-item' };

export function initialProgression(): Progression {
  return { currency: GACHA_CONFIG.startingCurrency, owned: {}, pity: 0, shards: 0 };
}

export const reset = initialProgression;

export function costOf(count: PullCount): number {
  return count === 1 ? GACHA_CONFIG.costSingle : GACHA_CONFIG.costTen;
}

export function canAfford(p: Progression, count: PullCount): boolean {
  return p.currency >= costOf(count);
}

// Renvoie un nouvel état complet (débit, gains, éclats, pity) : la scène le sauvegarde
// d'un bloc, ce qui rend tout indissociable (001 FR-011, 002 FR-011).
export function pull(p: Progression, count: PullCount, rng: Rng): PullOutcome {
  if (!canAfford(p, count)) return { ok: false, reason: 'insufficient-funds' };
  const batch = count === 1 ? pullSingle(rng, p.owned, p.pity) : pullTen(rng, p.owned, p.pity);
  const owned: Record<string, number> = { ...p.owned };
  for (const r of batch.results) owned[r.item.id] = (owned[r.item.id] ?? 0) + 1;
  const shards = p.shards + batch.results.reduce((sum, r) => sum + r.shards, 0);
  return {
    ok: true,
    progression: { currency: p.currency - costOf(count), owned, pity: batch.pity, shards },
    results: batch.results,
  };
}

export function distinctOwned(p: Progression): number {
  return Object.keys(p.owned).length;
}

export function pullsUntilPity(p: Progression): number {
  return GACHA_CONFIG.pityThreshold - p.pity;
}

const rankOf = (item: Item) => RARITIES.find(r => r.id === item.rarity)!.rank;

// Éléments échangeables : non possédés, les plus rares d'abord (ce qui manque en fin de
// partie est presque toujours Légendaire ou Ultra rare), puis dans l'ordre du catalogue.
export function exchangeableItems(p: Progression): readonly Item[] {
  return CATALOGUE
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !(item.id in p.owned))
    .sort((a, b) => rankOf(b.item) - rankOf(a.item) || a.index - b.index)
    .map(({ item }) => item);
}

// Un échange n'est pas un tirage : ni pièces, ni pity (FR-016).
export function exchange(p: Progression, itemId: string): ExchangeOutcome {
  const item = CATALOGUE.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: 'unknown-item' };
  if (item.id in p.owned) return { ok: false, reason: 'already-owned' };
  const cost = SHARD_COST[item.rarity];
  if (p.shards < cost) return { ok: false, reason: 'insufficient-shards' };
  return {
    ok: true,
    progression: { ...p, owned: { ...p.owned, [item.id]: 1 }, shards: p.shards - cost },
    item,
  };
}
