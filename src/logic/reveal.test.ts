import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue';
import { RARITIES, type Rarity } from '../data/gachaConfig';
import type { PullResult } from './gacha';
import { bestRarity, flipDuration, flipOrder, planReveal, revealDuration, type RevealPlan } from './reveal';
import { mulberry32 } from './rng';
import { scriptedRng } from './testing';

const itemOf = (rarity: Rarity, n = 0) => CATALOGUE.filter(i => i.rarity === rarity)[n]!;
const res = (rarity: Rarity, n = 0): PullResult =>
  ({ item: itemOf(rarity, n), isNew: true, guaranteed: false, pity: false, shards: 0 });
const single = (rarity: Rarity) => [res(rarity)];
const ALL: Rarity[] = RARITIES.map(r => r.id);

describe('palier final = meilleure rareté (FR-003, SC-001)', () => {
  it('au ×1, la rareté du résultat', () => {
    for (const r of ALL) expect(bestRarity(single(r))).toBe(r);
  });

  it('au ×10, la plus haute des 10, où qu’elle soit', () => {
    const ten = [res('common'), res('rare'), res('legendary'), res('uncommon'), res('ultra'),
      res('common'), res('rare'), res('legendary'), res('common'), res('common')];
    expect(bestRarity(ten)).toBe('ultra');
    expect(bestRarity([...ten.slice(0, 4), ...ten.slice(5)])).toBe('legendary');
  });

  it('le dernier palier montré est toujours le vrai, quel que soit le hasard', () => {
    for (const r of ALL) {
      for (const u of [0, 0.05, 0.0999, 0.1, 0.2, 0.3499, 0.35, 0.5, 0.9999]) {
        for (const v of [0, 0.1999, 0.2, 0.9999]) {
          const plan = planReveal(single(r), scriptedRng([u, v]));
          expect(plan.final).toBe(r);
          expect(plan.steps.at(-1)).toBe(r);
        }
      }
    }
  });
});

describe('montée (FR-011, US3)', () => {
  it('Légendaire et Ultra rare : u < 0,25 monte du palier juste en dessous', () => {
    expect(planReveal(single('legendary'), scriptedRng([0.2499])).steps).toEqual(['rare', 'legendary']);
    expect(planReveal(single('ultra'), scriptedRng([0])).steps).toEqual(['legendary', 'ultra']);
    expect(planReveal(single('legendary'), scriptedRng([0.25])).kind).toBe('direct');
  });

  it('Rare : la montée occupe [0,10 ; 0,35) et part de Peu commun', () => {
    expect(planReveal(single('rare'), scriptedRng([0.1])).steps).toEqual(['uncommon', 'rare']);
    expect(planReveal(single('rare'), scriptedRng([0.3499])).kind).toBe('rise');
    expect(planReveal(single('rare'), scriptedRng([0.35])).kind).toBe('direct');
  });

  it('jamais pour Commun ni Peu commun', () => {
    for (const r of ['common', 'uncommon'] as const) {
      for (const u of [0, 0.05, 0.2, 0.3]) expect(planReveal(single(r), scriptedRng([u])).kind).toBe('direct');
    }
  });
});

describe('leurre (FR-012, US4)', () => {
  it('Rare, u < 0,10 : Ultra rare si v < 0,2, Légendaire sinon, puis Rare', () => {
    expect(planReveal(single('rare'), scriptedRng([0.0999, 0.1999])).steps).toEqual(['ultra', 'rare']);
    expect(planReveal(single('rare'), scriptedRng([0, 0.2])).steps).toEqual(['legendary', 'rare']);
  });

  it('jamais pour les autres paliers', () => {
    for (const r of ALL.filter(x => x !== 'rare')) {
      expect(planReveal(single(r), scriptedRng([0, 0])).kind).not.toBe('lure');
    }
  });

  it('consomme une seconde valeur seulement pour un leurre', () => {
    // scriptedRng échoue s'il est lu au-delà de ce qu'on lui donne.
    for (const r of ALL) expect(() => planReveal(single(r), scriptedRng([0.5]))).not.toThrow();
    expect(() => planReveal(single('legendary'), scriptedRng([0]))).not.toThrow();
    expect(() => planReveal(single('rare'), scriptedRng([0]))).toThrow();
  });
});

describe('fréquences (SC-006, SC-007)', () => {
  const N = 100_000;
  const tally = (rarity: Rarity, seed: number) => {
    const rng = mulberry32(seed);
    const kinds = { direct: 0, rise: 0, lure: 0, lureUltra: 0 };
    for (let i = 0; i < N; i++) {
      const plan = planReveal(single(rarity), rng);
      kinds[plan.kind]++;
      if (plan.kind === 'lure' && plan.steps[0] === 'ultra') kinds.lureUltra++;
    }
    return kinds;
  };

  it('Rare : 10 % de leurres dont 1/5 Ultra, 25 % de montées', () => {
    const k = tally('rare', 11);
    expect(Math.abs(k.lure / N - 0.1)).toBeLessThan(0.005);
    expect(Math.abs(k.lureUltra / k.lure - 0.2)).toBeLessThan(0.02);
    expect(Math.abs(k.rise / N - 0.25)).toBeLessThan(0.008);
  });

  it('Légendaire et Ultra rare : 25 % de montées, aucun leurre', () => {
    for (const r of ['legendary', 'ultra'] as const) {
      const k = tally(r, 12);
      expect(Math.abs(k.rise / N - 0.25)).toBeLessThan(0.008);
      expect(k.lure).toBe(0);
    }
  });

  it('Commun et Peu commun : aucune fausse piste', () => {
    for (const r of ['common', 'uncommon'] as const) expect(tally(r, 13).direct).toBe(N);
  });
});

describe('ordre de retournement du ×10 (FR-008)', () => {
  it('ordre du tirage, vedette (dernier résultat de la meilleure rareté) en dernier', () => {
    const ten = [res('common'), res('legendary', 0), res('rare'), res('legendary', 1), res('common'),
      res('uncommon'), res('common'), res('rare'), res('common'), res('common')];
    expect(flipOrder(ten)).toEqual([0, 1, 2, 4, 5, 6, 7, 8, 9, 3]);
  });

  it('vedette déjà en dernière position : ordre du tirage', () => {
    const ten = [...Array.from({ length: 9 }, () => res('common')), res('rare')];
    expect(flipOrder(ten)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('au ×1, une seule carte', () => {
    expect(planReveal(single('ultra'), scriptedRng([0.9])).flipOrder).toEqual([0]);
  });
});

describe('durées (FR-010, SC-003)', () => {
  // Tous les plans possibles : chaque palier final, direct, montée ou leurre.
  const plans: RevealPlan[] = ALL.flatMap(r => [0, 0.05, 0.15, 0.6].flatMap(u =>
    [0, 0.5].map(v => planReveal(single(r), scriptedRng([u, v])))));

  it('Commun ≤ 3 s, tout plan ≤ 5 s', () => {
    expect(plans.some(p => p.kind === 'rise' && p.final === 'ultra')).toBe(true);
    expect(plans.some(p => p.kind === 'lure' && p.steps[0] === 'ultra')).toBe(true);
    for (const p of plans) {
      expect(revealDuration(p), p.steps.join('>')).toBeLessThanOrEqual(5000);
      if (p.final === 'common') expect(revealDuration(p)).toBeLessThanOrEqual(3000);
    }
  });

  it('une révélation plus haute dure au moins autant (FR-004)', () => {
    const direct = ALL.map(r => revealDuration(planReveal(single(r), scriptedRng([0.9]))));
    expect(direct).toEqual([...direct].sort((a, b) => a - b));
    expect(new Set(direct).size).toBe(ALL.length);
  });

  it('une fausse piste dure plus longtemps que le même palier en direct', () => {
    const direct = revealDuration(planReveal(single('legendary'), scriptedRng([0.9])));
    expect(revealDuration(planReveal(single('legendary'), scriptedRng([0])))).toBeGreaterThan(direct);
  });

  it('retournement des 10 cartes ≤ 4 s ; rien au ×1', () => {
    expect(flipDuration(10)).toBeLessThanOrEqual(4000);
    expect(flipDuration(10)).toBeGreaterThan(0);
    expect(flipDuration(1)).toBe(0);
  });
});
