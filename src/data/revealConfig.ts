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
  // Présentation plein écran (007, FR-003) : rang minimal d'un résultat présenté.
  presentMinRank: 3,
} as const;

// Durées en millisecondes (research R3). Bornes de FR-010 vérifiées par les tests.
export const REVEAL_TIMING = {
  // Révision 2 (2026-10-30, FR-016) : 1,6 s en trois temps. Fissures aux fractions du
  // suspense, puis tout se fige sur ses `freeze` dernières ms avant l'éclatement.
  suspense: 1600,
  cracks: [0.45, 0.65, 0.82],
  // Battements du cœur de l'orbe, de plus en plus rapprochés, que l'image (halo) et le son
  // (révision du 2026-11-13, FR-017) partagent. Le 2ᵉ tombe sur la 1ʳᵉ fissure (0,45) : à
  // 16 ms près, les deux coups faisaient un « flam ».
  beats: [0.3, 0.45, 0.6, 0.71, 0.8, 0.87],
  freeze: 150,
  // Révélation du vrai palier : plus le palier est haut, plus elle dure.
  final: { common: 600, uncommon: 800, rare: 1100, legendary: 1500, ultra: 2000 } satisfies Record<Rarity, number>,
  // Palier montré par une fausse piste avant le vrai, puis bascule vers le vrai.
  fakeStep: 700,
  transition: 300,
} as const;

// Rythme des effets de la révélation (révision 3 du 2026-11-13, lot A), en ms. Tous tiennent
// dans les créneaux de REVEAL_TIMING : ni la durée totale (FR-010) ni l'instant des sons ne
// bougent.
export const REVEAL_MOTION = {
  // Entrée : la nuit tombe d'un coup, l'orbe gagne le centre en dépassant un peu.
  nightIn: 240,
  orbIn: 400,
  // « Touche pour passer » : fondu à l'armement, puis pulsation (demi-période).
  hintIn: 200,
  hintPulse: 700,
  // Battement du cœur (instants : REVEAL_TIMING.beats) : anneau et lueur, puis pulsation.
  beat: 260,
  beatPulse: 80,
  // Fissure : la lueur derrière l'orbe monte, un anneau fin s'étend, l'orbe sursaute.
  crackGlowIn: 90,
  crackRing: 160,
  crackJolt: 120,
  // Impact : éclair qui monte puis vire à la couleur du palier ; coup de poing ; secousse.
  flashIn: 50,
  flashOut: 280,
  punch: 160,
  shake: 280,
  // Palier vivant (FR-019) : rotation des rayons (degrés par seconde, longs puis courts),
  // respiration des rayons et du cœur, orbite des étincelles, cycle de couleurs de l'Ultra.
  rayTurn: [25, -15],
  rayBreath: 700,
  coreBreath: 600,
  orbit: 1800,
  hueCycle: 1200,
  wave: 650,
  waveGap: 250,
  // Nom du palier : second rebond, puis l'emblème se pose en tampon.
  labelIn: 300,
  labelRebound: 600,
  labelReboundMs: 240,
  emblemDelay: 120,
  emblemIn: 220,
  // Leurre : hoquets à la fin du faux palier, puis teinte éteinte et chute (dans `transition`).
  hiccups: 240,
  fizzle: 200,
  // Montée : aspiration, puis étirement juste avant l'éclat du vrai palier.
  riseSuck: 180,
  // Sortie naturelle : voile de lumière sur la fin, qui s'efface sur l'écran suivant.
  outro: 120,
  outroFade: 220,
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
