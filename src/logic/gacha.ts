import { CATALOGUE, type Item } from '../data/catalogue';
import { GACHA_CONFIG, RARITIES, SHARD_GAIN, type Rarity } from '../data/gachaConfig';
import { rollRarity } from './rates';
import type { Rng } from './rng';

export type Owned = Readonly<Record<string, number>>;

export interface PullResult {
  readonly item: Item;
  // Évalué au moment de ce résultat : un doublon dans la même salve n'est plus nouveau.
  readonly isNew: boolean;
  // Vrai si le résultat vient de la table restreinte de la garantie du ×10.
  readonly guaranteed: boolean;
  // Vrai si le résultat a été forcé par le pity (002).
  readonly pity: boolean;
  // Éclats rapportés : le gain de la rareté pour un doublon, 0 pour un nouvel élément.
  readonly shards: number;
}

export interface PullBatch {
  readonly results: PullResult[];
  // Compteur de pity après la salve : résultats consécutifs sans Légendaire ou mieux.
  readonly pity: number;
}

const ITEMS_BY_RARITY = new Map<Rarity, readonly Item[]>();
for (const item of CATALOGUE) {
  ITEMS_BY_RARITY.set(item.rarity, [...(ITEMS_BY_RARITY.get(item.rarity) ?? []), item]);
}

const rankOf = (rarity: Rarity) => RARITIES.find(r => r.id === rarity)!.rank;

// Un résultat. Le pity s'évalue résultat par résultat, y compris au milieu d'un ×10 :
// celui qui serait le 40ᵉ sans Légendaire est tiré dans la table restreinte.
// Ordre de consommation du hasard, contractuel pour les tests : la rareté, puis l'élément.
function step(rng: Rng, seen: Set<string>, pity: number, tenMinRank: number): { result: PullResult; pity: number } {
  const forced = pity + 1 >= GACHA_CONFIG.pityThreshold;
  // Le pity exige plus que la garantie du ×10 (testé dans la config) : un résultat
  // forcé par le pity satisfait aussi le Rare-ou-mieux de la salve.
  const minRank = forced ? GACHA_CONFIG.pityMinRank : tenMinRank;
  const rarity = rollRarity(rng, minRank);
  const items = ITEMS_BY_RARITY.get(rarity.id)!;
  const item = items[Math.floor(rng() * items.length)]!;
  const isNew = !seen.has(item.id);
  seen.add(item.id);
  return {
    result: { item, isNew, guaranteed: tenMinRank > 0, pity: forced, shards: isNew ? 0 : SHARD_GAIN[item.rarity] },
    pity: rarity.rank >= GACHA_CONFIG.pityMinRank ? 0 : pity + 1,
  };
}

export function pullSingle(rng: Rng, owned: Owned, pity: number): PullBatch {
  const { result, pity: next } = step(rng, new Set(Object.keys(owned)), pity, 0);
  return { results: [result], pity: next };
}

export function pullTen(rng: Rng, owned: Owned, pity: number): PullBatch {
  const seen = new Set(Object.keys(owned));
  const results: PullResult[] = [];
  let counter = pity;
  for (let i = 0; i < 10; i++) {
    const hasRare = results.some(r => rankOf(r.item.rarity) >= GACHA_CONFIG.guaranteedMinRank);
    const tenMinRank = i === 9 && !hasRare ? GACHA_CONFIG.guaranteedMinRank : 0;
    const out = step(rng, seen, counter, tenMinRank);
    results.push(out.result);
    counter = out.pity;
  }
  return { results, pity: counter };
}
