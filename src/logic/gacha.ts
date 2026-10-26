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
  // Vrai si le résultat est la vedette obtenue par la garantie vedette (006).
  readonly featuredGuarantee: boolean;
}

// Vedette de la bannière active et état de sa garantie (006).
export interface FeaturedState {
  readonly item: Item;
  readonly guaranteed: boolean;
}

export interface PullBatch {
  readonly results: PullResult[];
  // Compteur de pity après la salve : résultats consécutifs sans Légendaire ou mieux.
  readonly pity: number;
  // Garantie vedette après la salve ; false sans vedette.
  readonly featuredGuaranteed: boolean;
}

const ITEMS_BY_RARITY = new Map<Rarity, readonly Item[]>();
for (const item of CATALOGUE) {
  ITEMS_BY_RARITY.set(item.rarity, [...(ITEMS_BY_RARITY.get(item.rarity) ?? []), item]);
}

const rankOf = (rarity: Rarity) => RARITIES.find(r => r.id === rarity)!.rank;

// Un résultat. Le pity s'évalue résultat par résultat, y compris au milieu d'un ×10 :
// celui qui serait le 40ᵉ sans Légendaire est tiré dans la table restreinte.
// Ordre de consommation du hasard, contractuel pour les tests (006, research R1) : la
// rareté ; puis, si c'est celle de la vedette, rien sous garantie, sinon le 50/50 et,
// s'il est perdu, l'élément parmi les autres ; dans tous les autres cas, l'élément.
function step(
  rng: Rng, seen: Set<string>, pity: number, tenMinRank: number, featured: FeaturedState | null,
): { result: PullResult; pity: number; featured: FeaturedState | null } {
  const forced = pity + 1 >= GACHA_CONFIG.pityThreshold;
  // Le pity exige plus que la garantie du ×10 (testé dans la config) : un résultat
  // forcé par le pity satisfait aussi le Rare-ou-mieux de la salve.
  const minRank = forced ? GACHA_CONFIG.pityMinRank : tenMinRank;
  const rarity = rollRarity(rng, minRank);
  const { item, featured: next, fromGuarantee } = pickItem(rng, rarity.id, featured);
  const isNew = !seen.has(item.id);
  seen.add(item.id);
  return {
    result: {
      item, isNew, guaranteed: tenMinRank > 0, pity: forced, shards: isNew ? 0 : SHARD_GAIN[item.rarity],
      featuredGuarantee: fromGuarantee,
    },
    pity: rarity.rank >= GACHA_CONFIG.pityMinRank ? 0 : pity + 1,
    featured: next,
  };
}

function pickItem(
  rng: Rng, rarity: Rarity, featured: FeaturedState | null,
): { item: Item; featured: FeaturedState | null; fromGuarantee: boolean } {
  const items = ITEMS_BY_RARITY.get(rarity)!;
  if (!featured || featured.item.rarity !== rarity) {
    return { item: items[Math.floor(rng() * items.length)]!, featured, fromGuarantee: false };
  }
  const closed = { item: featured.item, guaranteed: false };
  if (featured.guaranteed) return { item: featured.item, featured: closed, fromGuarantee: true };
  if (rng() < GACHA_CONFIG.featuredChance) return { item: featured.item, featured: closed, fromGuarantee: false };
  // 50/50 perdu : un des autres, chacun avec la même chance, et la garantie s'ouvre.
  const others = items.filter(i => i.id !== featured.item.id);
  return {
    item: others[Math.floor(rng() * others.length)]!,
    featured: { item: featured.item, guaranteed: true },
    fromGuarantee: false,
  };
}

export function pullSingle(rng: Rng, owned: Owned, pity: number, featured: FeaturedState | null = null): PullBatch {
  const out = step(rng, new Set(Object.keys(owned)), pity, 0, featured);
  return { results: [out.result], pity: out.pity, featuredGuaranteed: out.featured?.guaranteed ?? false };
}

export function pullTen(rng: Rng, owned: Owned, pity: number, featured: FeaturedState | null = null): PullBatch {
  const seen = new Set(Object.keys(owned));
  const results: PullResult[] = [];
  let counter = pity;
  let state = featured;
  for (let i = 0; i < 10; i++) {
    const hasRare = results.some(r => rankOf(r.item.rarity) >= GACHA_CONFIG.guaranteedMinRank);
    const tenMinRank = i === 9 && !hasRare ? GACHA_CONFIG.guaranteedMinRank : 0;
    const out = step(rng, seen, counter, tenMinRank, state);
    results.push(out.result);
    counter = out.pity;
    state = out.featured;
  }
  return { results, pity: counter, featuredGuaranteed: state?.guaranteed ?? false };
}
