import { CATALOGUE, type Item } from '../data/catalogue';
import { GACHA_CONFIG, RARITIES, type Rarity } from '../data/gachaConfig';
import { rollRarity } from './rates';
import type { Rng } from './rng';

export type Owned = Readonly<Record<string, number>>;

export interface PullResult {
  readonly item: Item;
  // Évalué au moment de ce résultat : un doublon dans la même salve n'est plus nouveau.
  readonly isNew: boolean;
  // Vrai si le résultat vient de la table restreinte de la garantie du ×10.
  readonly guaranteed: boolean;
}

const ITEMS_BY_RARITY = new Map<Rarity, readonly Item[]>();
for (const item of CATALOGUE) {
  ITEMS_BY_RARITY.set(item.rarity, [...(ITEMS_BY_RARITY.get(item.rarity) ?? []), item]);
}

// Ordre de consommation du hasard, contractuel pour les tests : la rareté, puis l'élément.
function rollOne(rng: Rng, seen: Set<string>, minRank: number): PullResult {
  const rarity = rollRarity(rng, minRank);
  const items = ITEMS_BY_RARITY.get(rarity.id)!;
  const item = items[Math.floor(rng() * items.length)]!;
  const isNew = !seen.has(item.id);
  seen.add(item.id);
  return { item, isNew, guaranteed: minRank > 0 };
}

export function pullSingle(rng: Rng, owned: Owned): PullResult[] {
  return [rollOne(rng, new Set(Object.keys(owned)), 0)];
}

export function pullTen(rng: Rng, owned: Owned): PullResult[] {
  const seen = new Set(Object.keys(owned));
  const results: PullResult[] = [];
  for (let i = 0; i < 9; i++) results.push(rollOne(rng, seen, 0));
  const hasRare = results.some(r => rankOf(r.item.rarity) >= GACHA_CONFIG.guaranteedMinRank);
  results.push(rollOne(rng, seen, hasRare ? 0 : GACHA_CONFIG.guaranteedMinRank));
  return results;
}

function rankOf(rarity: Rarity): number {
  return RARITIES.find(r => r.id === rarity)!.rank;
}
