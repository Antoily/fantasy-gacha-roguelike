// Ambiance de l'écran de tirage (007, révision du 2026-11-09 : FR-013, FR-014).
// Décor seulement : rien ici ne touche aux règles ni au hasard du tirage.
export const AMBIENCE = {
  // Lévitation de l'orbe : amplitude (px) et durée d'un aller-retour (ms), cycle de 2 à 4 s.
  orbFloat: 5,
  orbCycle: 3200,
  // Éclat de l'orbe : opacité basse et haute de la lueur qui pulse derrière elle.
  orbGlow: [0.2, 0.55],
  orbGlowScale: 1.12,
  // Lueurs du ciel : une naissance par 1/rate s ; une dizaine visibles à la fois.
  moteRate: 2.4,
  moteLife: [4500, 7500],
  moteSpeed: [10, 22],
  moteSize: [2.5, 4.5],
  moteFadeIn: 800,
  // Zone où elles naissent (le ciel, sous l'en-tête).
  moteArea: { x: 12, y: 120, w: 336, h: 500 },
  // Halo des tirages payables : durée d'une respiration (ms), opacités, écart au bouton (px).
  haloCycle: 1800,
  haloAlpha: [0.45, 1],
  // Anneaux du halo, du plus serré au plus large : écart au bouton (px) et opacité.
  haloRings: [[3, 1], [7, 0.6], [11, 0.3]],
} as const;
