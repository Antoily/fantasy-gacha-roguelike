import { RARITIES, type Rarity, type RarityInfo } from '../data/gachaConfig';
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

export function formatPercent(value: number): string {
  // Arrondi d'affichage à une décimale ; les poids entiers sur 1 000 n'en ont pas besoin de plus.
  const rounded = Math.round(value * 10) / 10;
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
