import type { Rarity } from './gachaConfig';

// Révélation (004) : probabilités des fausses pistes et durées de la mise en scène.
// Les fausses pistes ne changent rien au tirage, seulement ce que l'animation montre.
export const REVEAL_CONFIG = {
  // Montée (FR-011) : palier Rare ou plus, l'animation part du palier juste en dessous.
  riseChance: 0.25,
  // Leurre (FR-012) : palier Rare seulement, l'animation fait croire à mieux puis retombe.
  lureChance: 0.1,
  // Part des leurres qui montrent Ultra rare (les autres montrent Légendaire).
  lureUltraShare: 0.2,
} as const;

// Durées en millisecondes (research R3). Bornes de FR-010 vérifiées par les tests.
export const REVEAL_TIMING = {
  suspense: 900,
  // Révélation du vrai palier : plus le palier est haut, plus elle dure.
  final: { common: 600, uncommon: 800, rare: 1100, legendary: 1500, ultra: 2000 } satisfies Record<Rarity, number>,
  // Palier montré par une fausse piste avant le vrai, puis bascule vers le vrai.
  fakeStep: 700,
  transition: 300,
  // Retournement des cartes du ×10 : une carte ordinaire, la pause, puis la vedette.
  flipCard: 200,
  flipPause: 400,
  flipStar: 700,
} as const;
