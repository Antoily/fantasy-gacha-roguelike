import { RARITIES, type Rarity } from '../data/gachaConfig';
import { REVEAL_CONFIG, REVEAL_TIMING } from '../data/revealConfig';
import type { PullResult } from './gacha';
import type { Rng } from './rng';

export type RevealKind = 'direct' | 'rise' | 'lure';

export interface RevealPlan {
  readonly kind: RevealKind;
  // Paliers montrés dans l'ordre ; le dernier est toujours le vrai (FR-005).
  readonly steps: readonly Rarity[];
  readonly final: Rarity;
  // Ordre de retournement des cartes : vedette en dernier (FR-008).
  readonly flipOrder: readonly number[];
}

const rankOf = (rarity: Rarity) => RARITIES.find(r => r.id === rarity)!.rank;
const byRank = (rank: number) => RARITIES.find(r => r.rank === rank)!.id;
const RARE_RANK = rankOf('rare');

export function bestRarity(results: readonly PullResult[]): Rarity {
  return byRank(Math.max(...results.map(r => rankOf(r.item.rarity))));
}

// La vedette est le DERNIER résultat de la meilleure rareté : elle garde le suspense
// jusqu'au bout et les autres se retournent dans l'ordre du tirage.
export function flipOrder(results: readonly PullResult[]): number[] {
  const best = bestRarity(results);
  let star = 0;
  results.forEach((r, i) => { if (r.item.rarity === best) star = i; });
  return [...results.keys()].filter(i => i !== star).concat(star);
}

// Ordre de consommation du hasard, contractuel (research R2) : une valeur toujours,
// même sans fausse piste possible, puis une seconde pour un leurre seulement.
export function planReveal(results: readonly PullResult[], rng: Rng): RevealPlan {
  const final = bestRarity(results);
  const rank = rankOf(final);
  const order = flipOrder(results);
  const u = rng();
  const { riseChance, lureChance, lureUltraShare } = REVEAL_CONFIG;
  // Rare : le leurre occupe le bas de l'intervalle, la montée vient juste après.
  const lure = rank === RARE_RANK && u < lureChance;
  if (lure) {
    const fake: Rarity = rng() < lureUltraShare ? 'ultra' : 'legendary';
    return { kind: 'lure', steps: [fake, final], final, flipOrder: order };
  }
  const riseFrom = rank === RARE_RANK ? lureChance : 0;
  if (rank >= RARE_RANK && u >= riseFrom && u < riseFrom + riseChance) {
    return { kind: 'rise', steps: [byRank(rank - 1), final], final, flipOrder: order };
  }
  return { kind: 'direct', steps: [final], final, flipOrder: order };
}

// Durée de l'animation avant les cartes : suspense, paliers de fausse piste, vrai palier.
export function revealDuration(plan: RevealPlan): number {
  const t = REVEAL_TIMING;
  return t.suspense + (plan.steps.length - 1) * (t.fakeStep + t.transition) + t.final[plan.final];
}

// Retournement : toutes les cartes sauf la vedette, une pause, puis la vedette.
export function flipDuration(count: number): number {
  const t = REVEAL_TIMING;
  return count <= 1 ? 0 : (count - 1) * t.flipCard + t.flipPause + t.flipStar;
}
