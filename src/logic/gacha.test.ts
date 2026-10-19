import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue';
import { RARITIES } from '../data/gachaConfig';
import { pullSingle, pullTen } from './gacha';
import { mulberry32 } from './rng';
import { scriptedRng } from './testing';

const rankOf = (id: string) => RARITIES.find(r => r.id === id)!.rank;
const allOwned = Object.fromEntries(CATALOGUE.map(i => [i.id, 1]));

describe('tirage ×1 (US1)', () => {
  it('renvoie un seul résultat', () => {
    expect(pullSingle(mulberry32(1), {})).toHaveLength(1);
  });

  it('tire un élément de la rareté obtenue, uniformément (FR-005)', () => {
    const rng = mulberry32(5);
    const commons = CATALOGUE.filter(i => i.rarity === 'common').map(i => i.id);
    const counts = new Map<string, number>();
    let commonPulls = 0;
    for (let i = 0; i < 200_000; i++) {
      const [r] = pullSingle(rng, {});
      if (r!.item.rarity !== 'common') continue;
      commonPulls++;
      counts.set(r!.item.id, (counts.get(r!.item.id) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...commons].sort());
    for (const id of commons) {
      expect(Math.abs(counts.get(id)! / commonPulls - 1 / 6) * 6, id).toBeLessThan(0.05);
    }
  });

  it('signale un élément non possédé comme nouveau, un possédé comme déjà possédé', () => {
    const [first] = pullSingle(mulberry32(3), {});
    expect(first!.isNew).toBe(true);
    const [again] = pullSingle(mulberry32(3), { [first!.item.id]: 1 });
    expect(again!.item.id).toBe(first!.item.id);
    expect(again!.isNew).toBe(false);
  });

  it('fonctionne quand tout est possédé : que des doublons', () => {
    const results = pullTen(mulberry32(8), allOwned);
    expect(results).toHaveLength(10);
    expect(results.every(r => !r.isNew)).toBe(true);
  });
});

describe('tirage ×10 (US2)', () => {
  it('renvoie dix résultats', () => {
    expect(pullTen(mulberry32(1), {})).toHaveLength(10);
  });

  it('contient toujours au moins un Rare ou mieux, sur 10 000 salves (SC-003)', () => {
    const rng = mulberry32(11);
    for (let i = 0; i < 10_000; i++) {
      const results = pullTen(rng, {});
      expect(results.some(r => rankOf(r.item.rarity) >= 2)).toBe(true);
    }
  });

  // Ordre de consommation du hasard, par résultat : la rareté, puis l'élément.
  // 0 → Commun (premier palier), premier élément.
  const nineCommons = Array.from({ length: 9 }, () => [0, 0]).flat();

  it('tire le 10ᵉ dans la table restreinte quand les neuf premiers sont faibles (FR-007)', () => {
    // 0,99 : table complète → Légendaire (990/1000) ; restreinte → Ultra rare (128,7/130).
    const results = pullTen(scriptedRng([...nineCommons, 0.99, 0]), {});
    expect(results.slice(0, 9).every(r => !r.guaranteed)).toBe(true);
    expect(results[9]!.guaranteed).toBe(true);
    expect(results[9]!.item.rarity).toBe('ultra');
  });

  it('garantit même un tirage qui serait tombé sur Commun', () => {
    // 0,5 : table complète → Commun ; restreinte → Rare.
    const results = pullTen(scriptedRng([...nineCommons, 0.5, 0]), {});
    expect(results[9]!.item.rarity).toBe('rare');
  });

  it('n’applique pas la garantie quand la salve contient déjà un Rare', () => {
    // Le 1er résultat est un Rare (0,9 → 900/1000) ; le 10ᵉ reste un tirage normal.
    const values = [0.9, 0, ...Array.from({ length: 8 }, () => [0, 0]).flat(), 0.5, 0];
    const results = pullTen(scriptedRng(values), {});
    expect(results[0]!.item.rarity).toBe('rare');
    expect(results[9]!.item.rarity).toBe('common');
    expect(results.some(r => r.guaranteed)).toBe(false);
  });

  it('compte un doublon dans la même salve : premier nouveau, second déjà possédé (US2-3)', () => {
    const results = pullTen(scriptedRng([...nineCommons, 0.5, 0]), {});
    const firstCommon = results[0]!.item.id;
    expect(results[1]!.item.id).toBe(firstCommon);
    expect(results[0]!.isNew).toBe(true);
    expect(results[1]!.isNew).toBe(false);
  });
});
