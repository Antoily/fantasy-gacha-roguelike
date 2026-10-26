export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'ultra';

export interface RarityInfo {
  readonly id: Rarity;
  // Ordre croissant de la spec (FR-002) : « Rare ou mieux » = rang ≥ 2.
  readonly rank: number;
  readonly label: string;
  // Poids entiers sur 1 000 : pas d'arrondi flottant dans le tirage, et le
  // pourcentage affiché se calcule à partir de la même valeur (FR-016).
  readonly weight: number;
}

export const RARITIES: readonly RarityInfo[] = [
  { id: 'common', rank: 0, label: 'Commun', weight: 600 },
  { id: 'uncommon', rank: 1, label: 'Peu commun', weight: 270 },
  { id: 'rare', rank: 2, label: 'Rare', weight: 100 },
  { id: 'legendary', rank: 3, label: 'Légendaire', weight: 25 },
  { id: 'ultra', rank: 4, label: 'Ultra rare', weight: 5 },
];

export const GACHA_CONFIG = {
  costSingle: 100,
  costTen: 900,
  startingCurrency: 9000,
  // Le ×10 garantit au moins un résultat de ce rang ou plus (001, FR-007).
  guaranteedMinRank: 2,
  // Pity (002) : Légendaire ou mieux au plus tard au 40ᵉ tirage sans en avoir eu.
  pityThreshold: 40,
  pityMinRank: 3,
  // Bannières (006) : une par élément de ce rang ou plus ; quand la rareté de la
  // vedette tombe sur sa bannière, c'est elle avec cette chance (50/50), sinon la
  // suivante de cette rareté sur cette bannière l'est à coup sûr.
  featuredMinRank: 3,
  featuredChance: 0.5,
} as const;

// Éclats (002) : gagnés sur un doublon, dépensés pour obtenir un élément manquant.
export const SHARD_GAIN: Readonly<Record<Rarity, number>> = {
  common: 1, uncommon: 2, rare: 5, legendary: 15, ultra: 30,
};

export const SHARD_COST: Readonly<Record<Rarity, number>> = {
  common: 10, uncommon: 20, rare: 50, legendary: 150, ultra: 300,
};
