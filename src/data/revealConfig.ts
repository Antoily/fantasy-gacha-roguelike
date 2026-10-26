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
} as const;

// Retournement des cartes du ×10, une à une (révision du 2026-10-26) : le temps se
// mérite. Une carte commune passe vite ; plus la rareté est haute, plus son dos
// tremble et s'allume longtemps avant de se retourner (anticipation), et plus l'effet
// dure avant la carte suivante (après). La vedette (meilleure carte) vient en dernier :
// les autres s'assombrissent (pause), son dos bat comme un cœur, puis temps fort.
export const FLIP_TIMING = {
  anticipation: { common: 0, uncommon: 0, rare: 160, legendary: 380, ultra: 520 },
  turn: { common: 200, uncommon: 220, rare: 260, legendary: 300, ultra: 340 },
  after: { common: 0, uncommon: 40, rare: 140, legendary: 260, ultra: 340 },
  starPause: 300,
  starBeat: { common: 200, uncommon: 260, rare: 360, legendary: 620, ultra: 860 },
  starTurn: 360,
  starHold: 320,
  // Plafond du retournement complet (FR-010) : au-delà, les cartes ordinaires
  // accélèrent, la vedette garde son temps fort.
  max: 4000,
} satisfies {
  anticipation: Record<Rarity, number>;
  turn: Record<Rarity, number>;
  after: Record<Rarity, number>;
  starPause: number;
  starBeat: Record<Rarity, number>;
  starTurn: number;
  starHold: number;
  max: number;
};
