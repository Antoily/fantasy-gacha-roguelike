import { CATALOGUE, type Item } from '../data/catalogue';
import { RARITIES, SHARD_COST, type Rarity } from '../data/gachaConfig';
import { distinctOwned, type Progression } from './progression';

export interface CollectionEntry {
  readonly item: Item;
  // Exemplaires possédés ; 0 = manquant.
  readonly count: number;
  // Coût d'échange en éclats (utile pour un manquant).
  readonly cost: number;
  // Manquant ET couvert par le solde d'éclats : seul cas où un appui propose l'échange.
  readonly affordable: boolean;
}

export interface RaritySummary {
  readonly rarity: Rarity;
  readonly owned: number;
  readonly total: number;
}

const rankOf = (rarity: Rarity) => RARITIES.find(r => r.id === rarity)!.rank;

// Tout le catalogue, les plus rares d'abord puis dans l'ordre du catalogue : ce qui
// manque en fin de partie (Légendaires, Ultra rares) est en tête.
export function collectionEntries(p: Progression): readonly CollectionEntry[] {
  return CATALOGUE
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rankOf(b.item.rarity) - rankOf(a.item.rarity) || a.index - b.index)
    .map(({ item }) => {
      const count = p.owned[item.id] ?? 0;
      const cost = SHARD_COST[item.rarity];
      return { item, count, cost, affordable: count === 0 && p.shards >= cost };
    });
}

export function raritySummary(p: Progression): readonly RaritySummary[] {
  return [...RARITIES].reverse().map(r => {
    const items = CATALOGUE.filter(i => i.rarity === r.id);
    return { rarity: r.id, owned: items.filter(i => i.id in p.owned).length, total: items.length };
  });
}

export function isComplete(p: Progression): boolean {
  return distinctOwned(p) === CATALOGUE.length;
}
