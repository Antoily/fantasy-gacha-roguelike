import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue';
import { GACHA_CONFIG, RARITIES, SHARD_GAIN } from '../data/gachaConfig';
import { pullSingle, pullTen } from './gacha';
import { mulberry32 } from './rng';
import { scriptedRng } from './testing';

const rankOf = (id: string) => RARITIES.find(r => r.id === id)!.rank;
const allOwned = Object.fromEntries(CATALOGUE.map(i => [i.id, 1]));

describe('tirage ×1 (US1)', () => {
  it('renvoie un seul résultat', () => {
    expect(pullSingle(mulberry32(1), {}, 0).results).toHaveLength(1);
  });

  it('tire un élément de la rareté obtenue, uniformément (FR-005)', () => {
    const rng = mulberry32(5);
    const commons = CATALOGUE.filter(i => i.rarity === 'common').map(i => i.id);
    const counts = new Map<string, number>();
    let commonPulls = 0;
    for (let i = 0; i < 200_000; i++) {
      const [r] = pullSingle(rng, {}, 0).results;
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
    const [first] = pullSingle(mulberry32(3), {}, 0).results;
    expect(first!.isNew).toBe(true);
    const [again] = pullSingle(mulberry32(3), { [first!.item.id]: 1 }, 0).results;
    expect(again!.item.id).toBe(first!.item.id);
    expect(again!.isNew).toBe(false);
  });

  it('fonctionne quand tout est possédé : que des doublons', () => {
    const results = pullTen(mulberry32(8), allOwned, 0).results;
    expect(results).toHaveLength(10);
    expect(results.every(r => !r.isNew)).toBe(true);
  });
});

describe('tirage ×10 (US2)', () => {
  it('renvoie dix résultats', () => {
    expect(pullTen(mulberry32(1), {}, 0).results).toHaveLength(10);
  });

  it('contient toujours au moins un Rare ou mieux, sur 10 000 salves (SC-003)', () => {
    const rng = mulberry32(11);
    for (let i = 0; i < 10_000; i++) {
      const results = pullTen(rng, {}, 0).results;
      expect(results.some(r => rankOf(r.item.rarity) >= 2)).toBe(true);
    }
  });

  // Ordre de consommation du hasard, par résultat : la rareté, puis l'élément.
  // 0 → Commun (premier palier), premier élément.
  const nineCommons = Array.from({ length: 9 }, () => [0, 0]).flat();

  it('tire le 10ᵉ dans la table restreinte quand les neuf premiers sont faibles (FR-007)', () => {
    // 0,99 : table complète → Légendaire (990/1000) ; restreinte → Ultra rare (128,7/130).
    const results = pullTen(scriptedRng([...nineCommons, 0.99, 0]), {}, 0).results;
    expect(results.slice(0, 9).every(r => !r.guaranteed)).toBe(true);
    expect(results[9]!.guaranteed).toBe(true);
    expect(results[9]!.item.rarity).toBe('ultra');
  });

  it('garantit même un tirage qui serait tombé sur Commun', () => {
    // 0,5 : table complète → Commun ; restreinte → Rare.
    const results = pullTen(scriptedRng([...nineCommons, 0.5, 0]), {}, 0).results;
    expect(results[9]!.item.rarity).toBe('rare');
  });

  it('n’applique pas la garantie quand la salve contient déjà un Rare', () => {
    // Le 1er résultat est un Rare (0,9 → 900/1000) ; le 10ᵉ reste un tirage normal.
    const values = [0.9, 0, ...Array.from({ length: 8 }, () => [0, 0]).flat(), 0.5, 0];
    const results = pullTen(scriptedRng(values), {}, 0).results;
    expect(results[0]!.item.rarity).toBe('rare');
    expect(results[9]!.item.rarity).toBe('common');
    expect(results.some(r => r.guaranteed)).toBe(false);
  });

  it('compte un doublon dans la même salve : premier nouveau, second déjà possédé (US2-3)', () => {
    const results = pullTen(scriptedRng([...nineCommons, 0.5, 0]), {}, 0).results;
    const firstCommon = results[0]!.item.id;
    expect(results[1]!.item.id).toBe(firstCommon);
    expect(results[0]!.isNew).toBe(true);
    expect(results[1]!.isNew).toBe(false);
  });
});

// Neuf résultats Communs : rareté 0 → Commun, élément 0 → premier Commun.
const commons = (n: number) => Array.from({ length: n }, () => [0, 0]).flat();

describe('pity (002, US1)', () => {
  it('force un Légendaire ou mieux au 40ᵉ tirage sans en avoir eu (FR-001, FR-004)', () => {
    // 0 → tiré dans la table complète, ce serait un Commun ; restreinte → Légendaire.
    const { results, pity } = pullSingle(scriptedRng([0, 0]), {}, 39);
    expect(rankOf(results[0]!.item.rarity)).toBeGreaterThanOrEqual(3);
    expect(results[0]!.pity).toBe(true);
    expect(pity).toBe(0);
  });

  it('ne force rien avant le seuil et fait avancer le compteur', () => {
    const { results, pity } = pullSingle(scriptedRng([0, 0]), {}, 38);
    expect(results[0]!.item.rarity).toBe('common');
    expect(results[0]!.pity).toBe(false);
    expect(pity).toBe(39);
  });

  it('applique le seuil au résultat exact au milieu d’un ×10 (US1-2)', () => {
    // pity 37 : 1er → 38, 2e → 39, 3e forcé. 0,99 en table restreinte L/U → Ultra rare.
    const values = [...commons(2), 0.99, 0, ...commons(7)];
    const { results, pity } = pullTen(scriptedRng(values), {}, 37);
    expect(results.slice(0, 2).every(r => r.item.rarity === 'common' && !r.pity)).toBe(true);
    expect(results[2]!.item.rarity).toBe('ultra');
    expect(results[2]!.pity).toBe(true);
    // Après le forçage le compteur repart : sept Communs ensuite → 7.
    expect(pity).toBe(7);
  });

  it('remet le compteur à zéro sur un Légendaire naturel (FR-003)', () => {
    // 0,98 en table complète → Légendaire (tranche 970–995 sur 1 000).
    const { results, pity } = pullSingle(scriptedRng([0.98, 0]), {}, 20);
    expect(results[0]!.item.rarity).toBe('legendary');
    expect(results[0]!.pity).toBe(false);
    expect(pity).toBe(0);
  });

  it('cumule pity et garantie ×10 sur le même résultat : Légendaire ou mieux', () => {
    // pity 30 : le 10ᵉ résultat est à la fois le 40ᵉ et le Rare garanti de la salve.
    const { results } = pullTen(scriptedRng([...commons(9), 0, 0]), {}, 30);
    expect(rankOf(results[9]!.item.rarity)).toBeGreaterThanOrEqual(3);
    expect(results[9]!.pity).toBe(true);
  });

  it('tire le résultat forcé parmi Légendaire et Ultra rare à 25 / 5, à 5 % près', () => {
    const rng = mulberry32(17);
    let ultra = 0;
    const n = 300_000;
    for (let i = 0; i < n; i++) if (pullSingle(rng, {}, 39).results[0]!.item.rarity === 'ultra') ultra++;
    expect(Math.abs(ultra / n - 5 / 30) / (5 / 30)).toBeLessThan(0.05);
  });

  it('ne laisse jamais plus de 40 tirages entre deux Légendaires ou mieux (SC-001)', () => {
    const rng = mulberry32(23);
    let pity = 0;
    let since = 0;
    let longest = 0;
    for (let i = 0; i < 100_000; i++) {
      const out = pullSingle(rng, {}, pity);
      pity = out.pity;
      since++;
      if (rankOf(out.results[0]!.item.rarity) >= 3) {
        longest = Math.max(longest, since);
        since = 0;
      }
    }
    expect(longest).toBe(GACHA_CONFIG.pityThreshold);
  });
});

describe('éclats des doublons (002, US3)', () => {
  it('rapporte le gain de la rareté pour un doublon, rien pour un nouvel élément (FR-008, FR-009)', () => {
    const [fresh] = pullSingle(scriptedRng([0, 0]), {}, 0).results;
    expect(fresh!.isNew).toBe(true);
    expect(fresh!.shards).toBe(0);
    const [dupe] = pullSingle(scriptedRng([0.98, 0]), { 'roi-barbichon': 1 }, 0).results;
    expect(dupe!.item.id).toBe('roi-barbichon');
    expect(dupe!.shards).toBe(SHARD_GAIN.legendary);
  });

  it('ne compte comme doublon que le second exemplaire d’une même salve', () => {
    const { results } = pullTen(scriptedRng([...commons(9), 0.5, 0]), {}, 0);
    expect(results[0]!.shards).toBe(0);
    expect(results[1]!.shards).toBe(SHARD_GAIN.common);
  });
});
