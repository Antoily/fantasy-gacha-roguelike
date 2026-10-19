import { describe, expect, it } from 'vitest';
import { CATALOGUE } from './catalogue';
import { GACHA_CONFIG, RARITIES } from './gachaConfig';

describe('catalogue (FR-001, FR-003)', () => {
  it('contient 20 éléments aux identifiants uniques', () => {
    expect(CATALOGUE).toHaveLength(20);
    expect(new Set(CATALOGUE.map(i => i.id)).size).toBe(20);
  });

  it('respecte la répartition 6 / 5 / 4 / 3 / 2', () => {
    const counts = RARITIES.map(r => CATALOGUE.filter(i => i.rarity === r.id).length);
    expect(counts).toEqual([6, 5, 4, 3, 2]);
  });

  it('a au moins un personnage et une créature dans chaque rareté', () => {
    for (const r of RARITIES) {
      const kinds = new Set(CATALOGUE.filter(i => i.rarity === r.id).map(i => i.kind));
      expect(kinds, r.id).toEqual(new Set(['character', 'creature']));
    }
  });
});

describe('configuration (FR-006, FR-008, FR-009)', () => {
  it('a des raretés rangées de 0 à 4 dont les poids font 1 000', () => {
    expect(RARITIES.map(r => r.rank)).toEqual([0, 1, 2, 3, 4]);
    expect(RARITIES.map(r => r.weight)).toEqual([600, 270, 100, 25, 5]);
  });

  it('rend le ×10 strictement moins cher que dix ×1', () => {
    expect(GACHA_CONFIG.costTen).toBeLessThan(10 * GACHA_CONFIG.costSingle);
    expect([GACHA_CONFIG.costSingle, GACHA_CONFIG.costTen, GACHA_CONFIG.startingCurrency]).toEqual([100, 900, 9000]);
  });
});
