import { GACHA_CONFIG } from '../data/gachaConfig';
import { pullSingle, pullTen, type Owned, type PullResult } from './gacha';
import type { Rng } from './rng';

export interface Progression {
  readonly currency: number;
  // Absent = non possédé ; sinon nombre d'exemplaires (≥ 1).
  readonly owned: Owned;
}

export type PullCount = 1 | 10;

export type PullOutcome =
  | { readonly ok: true; readonly progression: Progression; readonly results: PullResult[] }
  | { readonly ok: false; readonly reason: 'insufficient-funds' };

export function initialProgression(): Progression {
  return { currency: GACHA_CONFIG.startingCurrency, owned: {} };
}

export const reset = initialProgression;

export function costOf(count: PullCount): number {
  return count === 1 ? GACHA_CONFIG.costSingle : GACHA_CONFIG.costTen;
}

export function canAfford(p: Progression, count: PullCount): boolean {
  return p.currency >= costOf(count);
}

// Renvoie un nouvel état complet (débit + gains) : la scène le sauvegarde d'un bloc,
// ce qui rend débit et gains indissociables (FR-011).
export function pull(p: Progression, count: PullCount, rng: Rng): PullOutcome {
  if (!canAfford(p, count)) return { ok: false, reason: 'insufficient-funds' };
  const results = count === 1 ? pullSingle(rng, p.owned) : pullTen(rng, p.owned);
  const owned: Record<string, number> = { ...p.owned };
  for (const r of results) owned[r.item.id] = (owned[r.item.id] ?? 0) + 1;
  return { ok: true, progression: { currency: p.currency - costOf(count), owned }, results };
}

export function distinctOwned(p: Progression): number {
  return Object.keys(p.owned).length;
}
