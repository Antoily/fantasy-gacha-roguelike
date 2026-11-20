import { RARITIES, type Rarity } from '../data/gachaConfig';
import { FLIP_TIMING, REVEAL_CONFIG, REVEAL_TIMING } from '../data/revealConfig';
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

export interface FlipStep {
  readonly index: number;
  readonly rarity: Rarity;
  readonly star: boolean;
  // Instants en ms depuis le début du retournement : le dos s'anime pendant
  // `anticipation`, puis la carte se retourne pendant `turn`.
  readonly at: number;
  readonly anticipation: number;
  readonly turn: number;
}

export interface FlipSchedule {
  readonly steps: readonly FlipStep[];
  // Départ de chaque carte depuis l'orbe, par indice du tirage (révision 3, FR-022) ; elle
  // se pose FLIP_TIMING.deal.flight ms plus tard.
  readonly deal: readonly number[];
  readonly duration: number;
}

const landing = (index: number) => index * FLIP_TIMING.deal.stagger + FLIP_TIMING.deal.flight;

// Calendrier du retournement du ×10, dans l'ordre de `order` (vedette en dernier). Les cartes
// sont d'abord distribuées depuis l'orbe ; une carte ne commence à s'animer qu'une fois posée.
// Une carte ordinaire prend un créneau qui grandit avec sa rareté ; si le tout dépasse le
// plafond (FLIP_TIMING.max, ou maxModest sans rien au-dessus du Rare), ces créneaux sont
// raccourcis d'un même facteur, la vedette garde le sien. Au ×1, rien à retourner.
export function flipSchedule(results: readonly PullResult[], order: readonly number[]): FlipSchedule {
  if (results.length <= 1) return { steps: [], deal: [], duration: 0 };
  const t = FLIP_TIMING;
  const ordinary = order.slice(0, -1).map(index => {
    const rarity = results[index]!.item.rarity;
    return { index, rarity, anticipation: t.anticipation[rarity], turn: t.turn[rarity], after: t.after[rarity] };
  });
  const starIndex = order[order.length - 1]!;
  const starRarity = results[starIndex]!.item.rarity;
  const starRest = t.starBeat[starRarity] + t.starTurn + t.starHold;
  const starPart = t.starPause + starRest;
  const cap = rankOf(starRarity) <= RARE_RANK ? t.maxModest : t.max;
  // Facteur k : chaque carte j attend au moins sa pose L_j, puis les créneaux restants
  // S_j (×k) s'enchaînent ; la fin vaut max_j (L_j + k·S_j) + starPart, qu'on borne au plafond.
  const slot = (c: (typeof ordinary)[number]) => c.anticipation + c.turn + c.after;
  let k = 1;
  let rest = ordinary.reduce((sum, c) => sum + slot(c), 0);
  for (const c of ordinary) {
    if (rest > 0) k = Math.min(k, (cap - starPart - landing(c.index)) / rest);
    rest -= slot(c);
  }

  const steps: FlipStep[] = [];
  let time = 0;
  for (const c of ordinary) {
    time = Math.max(time, landing(c.index));
    steps.push({ index: c.index, rarity: c.rarity, star: false, at: time, anticipation: c.anticipation * k, turn: c.turn * k });
    time += slot(c) * k;
  }
  // La vedette est toujours posée à ce moment (9 créneaux > distribution) : le test le vérifie.
  time += t.starPause;
  steps.push({ index: starIndex, rarity: starRarity, star: true, at: time, anticipation: t.starBeat[starRarity], turn: t.starTurn });
  const deal = results.map((_, i) => i * t.deal.stagger);
  return { steps, deal, duration: time + starRest };
}
