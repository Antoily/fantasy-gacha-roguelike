import type { Item } from '../data/catalogue';
import { GACHA_CONFIG, RARITIES, type Rarity, type RarityInfo } from '../data/gachaConfig';
import type { Rng } from './rng';

const TOTAL_WEIGHT = RARITIES.reduce((sum, r) => sum + r.weight, 0);

// Source unique des taux : le tirage et l'écran des taux lisent cette table (FR-016).
export function rarityTable(): readonly RarityInfo[] {
  return RARITIES;
}

export function ratePercent(rarity: Rarity): number {
  const info = RARITIES.find(r => r.id === rarity)!;
  return (info.weight / TOTAL_WEIGHT) * 100;
}

// Chance d'obtenir la vedette à un tirage, hors garanties (006, FR-016) : même source
// que le tirage, qui applique featuredChance à la rareté tirée.
export function featuredRatePercent(item: Item): number {
  return ratePercent(item.rarity) * GACHA_CONFIG.featuredChance;
}

export function formatPercent(value: number): string {
  // Deux décimales au plus : une vedette Légendaire est à 1,25 %, pas « 1,3 % ».
  const rounded = Math.round(value * 100) / 100;
  return `${String(rounded).replace('.', ',')} %`;
}

// Tirage pondéré d'une rareté. `minRank` restreint la table (garantie du ×10) en
// gardant entre elles les proportions des raretés restantes.
export function rollRarity(rng: Rng, minRank = 0): RarityInfo {
  const pool = RARITIES.filter(r => r.rank >= minRank);
  const total = pool.reduce((sum, r) => sum + r.weight, 0);
  const x = rng() * total;
  let acc = 0;
  for (const r of pool) {
    acc += r.weight;
    if (x < acc) return r;
  }
  return pool[pool.length - 1]!;
}
