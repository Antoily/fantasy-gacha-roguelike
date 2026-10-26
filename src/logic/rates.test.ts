import { describe, expect, it } from 'vitest';
import { RARITIES, type Rarity } from '../data/gachaConfig';
import { CATALOGUE } from '../data/catalogue';
import { featuredRatePercent, formatPercent, ratePercent, rarityTable, rollRarity } from './rates';
import { mulberry32 } from './rng';

describe('taux affichés (FR-015, FR-016)', () => {
  it('somment à 100 %', () => {
    const total = rarityTable().reduce((sum, r) => sum + ratePercent(r.id), 0);
    expect(total).toBeCloseTo(100, 10);
  });

  it('valent 60 / 27 / 10 / 2,5 / 0,5 %', () => {
    expect(rarityTable().map(r => formatPercent(ratePercent(r.id))))
      .toEqual(['60 %', '27 %', '10 %', '2,5 %', '0,5 %']);
  });

  it('se formatent à la française', () => {
    expect(formatPercent(2.5)).toBe('2,5 %');
    expect(formatPercent(60)).toBe('60 %');
  });

  it('affiche la chance d’une vedette par tirage : moitié de sa rareté (006, FR-016)', () => {
    const vedette = (id: string) => formatPercent(featuredRatePercent(CATALOGUE.find(i => i.id === id)!));
    expect(vedette('roi-barbichon')).toBe('1,25 %');
    expect(vedette('orbulle')).toBe('0,25 %');
  });
});

describe('tirage d’une rareté', () => {
  it('suit les taux affichés sur 1 000 000 de tirages, à 5 % près en relatif (SC-002)', () => {
    const rng = mulberry32(2026);
    const counts = new Map<Rarity, number>(RARITIES.map(r => [r.id, 0]));
    const n = 1_000_000;
    for (let i = 0; i < n; i++) {
      const r = rollRarity(rng).id;
      counts.set(r, counts.get(r)! + 1);
    }
    for (const r of rarityTable()) {
      const observed = (counts.get(r.id)! / n) * 100;
      const expected = ratePercent(r.id);
      expect(Math.abs(observed - expected) / expected, r.id).toBeLessThan(0.05);
    }
  });

  it('restreint au rang minimal garde les proportions 100 / 25 / 5 (FR-007)', () => {
    const rng = mulberry32(99);
    const counts = { rare: 0, legendary: 0, ultra: 0 } as Record<string, number>;
    const n = 1_000_000;
    for (let i = 0; i < n; i++) {
      const r = rollRarity(rng, 2);
      expect(r.rank).toBeGreaterThanOrEqual(2);
      counts[r.id]!++;
    }
    const expected = { rare: 100 / 130, legendary: 25 / 130, ultra: 5 / 130 };
    for (const [id, p] of Object.entries(expected)) {
      expect(Math.abs(counts[id]! / n - p) / p, id).toBeLessThan(0.05);
    }
  });
});
