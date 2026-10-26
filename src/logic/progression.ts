import { CATALOGUE, type Item } from '../data/catalogue';
import { GACHA_CONFIG, SHARD_COST } from '../data/gachaConfig';
import { findBanner, neighbourBanner, STANDARD, type Banner } from './banners';
import { pullSingle, pullTen, type FeaturedState, type Owned, type PullResult } from './gacha';
import type { Rng } from './rng';

export interface Progression {
  readonly currency: number;
  // Absent = non possédé ; sinon nombre d'exemplaires (≥ 1).
  readonly owned: Owned;
  // Résultats consécutifs sans Légendaire ou mieux (0 à pityThreshold − 1).
  readonly pity: number;
  // Solde d'éclats, gagnés sur les doublons.
  readonly shards: number;
  // Bannière active (006) : 'standard' ou l'id de sa vedette.
  readonly banner: string;
  // Bannières vedettes dont la garantie est ouverte (50/50 perdu), sans doublon.
  readonly guarantees: readonly string[];
}

export type PullCount = 1 | 10;

export type PullOutcome =
  | { readonly ok: true; readonly progression: Progression; readonly results: PullResult[] }
  | { readonly ok: false; readonly reason: 'insufficient-funds' };

export type ExchangeOutcome =
  | { readonly ok: true; readonly progression: Progression; readonly item: Item }
  | { readonly ok: false; readonly reason: 'already-owned' | 'insufficient-shards' | 'unknown-item' };

export function initialProgression(): Progression {
  return { currency: GACHA_CONFIG.startingCurrency, owned: {}, pity: 0, shards: 0, banner: STANDARD, guarantees: [] };
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
  const banner = activeBanner(p);
  // Seule la garantie de la bannière active entre dans le tirage : celles des autres
  // bannières restent intactes (FR-014).
  const featured: FeaturedState | null = banner.featured
    ? { item: banner.featured, guaranteed: p.guarantees.includes(banner.id) }
    : null;
  const batch = count === 1 ? pullSingle(rng, p.owned, p.pity, featured) : pullTen(rng, p.owned, p.pity, featured);
  const others = p.guarantees.filter(id => id !== banner.id);
  const owned: Record<string, number> = { ...p.owned };
  for (const r of batch.results) owned[r.item.id] = (owned[r.item.id] ?? 0) + 1;
  const shards = p.shards + batch.results.reduce((sum, r) => sum + r.shards, 0);
  return {
    ok: true,
    progression: {
      ...p,
      currency: p.currency - costOf(count), owned, pity: batch.pity, shards,
      guarantees: batch.featuredGuaranteed ? [...others, banner.id] : others,
    },
    results: batch.results,
  };
}

export function distinctOwned(p: Progression): number {
  return Object.keys(p.owned).length;
}

export function pullsUntilPity(p: Progression): number {
  return GACHA_CONFIG.pityThreshold - p.pity;
}

export function activeBanner(p: Progression): Banner {
  return findBanner(p.banner) ?? findBanner(STANDARD)!;
}

// Garantie vedette ouverte sur la bannière active (FR-015).
export function hasFeaturedGuarantee(p: Progression): boolean {
  return p.guarantees.includes(activeBanner(p).id);
}

// Changer de bannière ne touche à rien d'autre : ni pity, ni garanties (US3).
export function cycleBanner(p: Progression, step: 1 | -1): Progression {
  return { ...p, banner: neighbourBanner(p.banner, step).id };
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
