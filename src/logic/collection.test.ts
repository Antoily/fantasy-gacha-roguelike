import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue';
import { SHARD_COST } from '../data/gachaConfig';
import { collectionEntries, isComplete, raritySummary } from './collection';
import { distinctOwned, initialProgression, type Progression } from './progression';

const allOwned = Object.fromEntries(CATALOGUE.map(i => [i.id, 1]));
const some: Progression = { ...initialProgression(), owned: { gribouille: 3, orbulle: 1, 'lulu-tempete': 2 }, shards: 60 };

describe('collectionEntries (FR-002 à FR-004)', () => {
  it('liste les 20 éléments une fois, les plus rares d’abord puis dans l’ordre du catalogue', () => {
    const ids = collectionEntries(some).map(e => e.item.id);
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(20);
    expect(ids.slice(0, 6)).toEqual(['cosmo-l-infini', 'orbulle', 'roi-barbichon', 'marquise-cerise', 'tonnerrouf', 'professeur-fizz']);
    expect(ids.at(-1)).toBe('gloups');
  });

  it('donne le nombre d’exemplaires, 0 pour un manquant', () => {
    const byId = new Map(collectionEntries(some).map(e => [e.item.id, e]));
    expect(byId.get('gribouille')!.count).toBe(3);
    expect(byId.get('orbulle')!.count).toBe(1);
    expect(byId.get('bidule')!.count).toBe(0);
  });

  it('marque abordable un manquant dont le coût est couvert, à l’éclat près', () => {
    const at = (shards: number) => new Map(collectionEntries({ ...some, shards }).map(e => [e.item.id, e]));
    expect(at(SHARD_COST.rare).get('flambichon')!.affordable).toBe(true);
    expect(at(SHARD_COST.rare - 1).get('flambichon')!.affordable).toBe(false);
    expect(at(SHARD_COST.rare).get('flambichon')!.cost).toBe(SHARD_COST.rare);
  });

  it('ne marque jamais abordable un élément possédé (FR-011)', () => {
    const rich = collectionEntries({ ...some, shards: 10_000 });
    expect(rich.filter(e => e.count > 0).every(e => !e.affordable)).toBe(true);
  });
});

describe('raritySummary (FR-006, SC-004)', () => {
  it('compte possédés / total par rareté, de la plus haute à la plus basse', () => {
    expect(raritySummary(some).map(s => [s.rarity, s.owned, s.total])).toEqual([
      ['ultra', 1, 2], ['legendary', 0, 3], ['rare', 1, 4], ['uncommon', 0, 5], ['common', 1, 6],
    ]);
  });

  it('somme au compteur de l’écran de tirage', () => {
    for (const p of [initialProgression(), some, { ...some, owned: allOwned }]) {
      expect(raritySummary(p).reduce((sum, s) => sum + s.owned, 0)).toBe(distinctOwned(p));
    }
  });
});

describe('isComplete (FR-007)', () => {
  it('n’est vrai qu’à 20 / 20', () => {
    expect(isComplete({ ...some, owned: allOwned })).toBe(true);
    const almost = { ...allOwned };
    delete almost.gloups;
    expect(isComplete({ ...some, owned: almost })).toBe(false);
    expect(isComplete(initialProgression())).toBe(false);
  });
});
