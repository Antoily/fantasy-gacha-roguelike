// Ambiance de l'écran de tirage (007, révision du 2026-11-09 : FR-013, FR-014).
// Décor seulement : rien ici ne touche aux règles ni au hasard du tirage.
export const AMBIENCE = {
  // Lévitation de l'orbe : amplitude (px) et durée d'un aller-retour (ms), cycle de 2 à 4 s.
  // 7 px depuis la révision du 2026-11-13 (FR-022) : 5 px ne se voyaient pas.
  orbFloat: 7,
  orbCycle: 3200,
  // Éclat de l'orbe : opacité basse et haute de la lueur qui pulse derrière elle.
  orbGlow: [0.2, 0.55],
  orbGlowScale: 1.12,
  // Lueurs du ciel : étoiles à quatre branches (révision du 2026-11-13, FR-022) ; une naissance
  // par 1/rate s. Elles scintillent (échelle lo ↔ hi en
  // `twinkle` ms) et tournent lentement (rad/s) : un point rond se perdait dans le pastel.
  // `moteWarm` naissent d'emblée, à l'arrivée sur l'écran : le ciel n'est jamais vide.
  // L'interface en cache la plupart : le débit compte celles qui passent derrière elle.
  moteRate: 4.5,
  moteWarm: 14,
  moteLife: [4500, 7500],
  moteSpeed: [10, 22],
  moteSize: [4, 7],
  moteFadeIn: 800,
  moteTwinkle: { period: 900, scale: [0.6, 1.2] },
  moteSpin: [-1.2, 1.2],
  // Zone où elles naissent (le ciel, sous l'en-tête).
  moteArea: { x: 12, y: 120, w: 336, h: 500 },
  // Halo des tirages payables : durée d'une respiration (ms), opacités, écart au bouton (px).
  haloCycle: 1800,
  haloAlpha: [0.45, 1],
  // Anneaux du halo, du plus serré au plus large : écart au bouton (px) et opacité.
  haloRings: [[3, 1], [7, 0.6], [11, 0.3]],
  // Étoiles en orbite autour de l'orbe (FR-022) : ellipse (px) inclinée (degrés), un tour en
  // `period` ms ; derrière l'orbe, elles pâlissent et rapetissent (profondeur).
  orbit: {
    count: 3, rx: 70, ry: 22, tilt: -12, period: 4200, size: 6,
    backAlpha: 0.4, backScale: 0.7, frontScale: 1.15,
  },
  // Éclat de l'orbe : disques concentriques (rayon en part du rayon de l'orbe, opacité) ; la
  // couleur suit la vedette de la bannière (FR-023) et passe de l'une à l'autre en `tintFade` ms.
  orbGlowRings: [[1.5, 0.25], [1.32, 0.4], [1.16, 0.6]],
  tintFade: 300,
  // Reflet des tirages payables (FR-021) : bande large de `width` px, penchée de `slant` px,
  // qui traverse en `sweep` ms toutes les `every` ms ; le ×10 part `stagger` ms après le ×1.
  // `inset` : la bande reste à l'intérieur du contour encre.
  gloss: { width: 26, slant: 22, sweep: 520, every: 3600, stagger: 300, first: 900, inset: 2 },
} as const;

// Transitions de l'écran (FR-015 à FR-017), en ms : toutes sous les bornes de la spec.
export const TRANSITIONS = {
  // Montant qui défile (≤ 600) et rebond de son icône (agrandie de iconBounce).
  roll: 600,
  iconBounce: 1.3,
  // Bandeau de bannière : glissement (≤ 250) depuis slideOffset px du côté de la flèche.
  slide: 220,
  slideOffset: 28,
  // Fondu d'entrée d'une fenêtre (≤ 200).
  fade: 120,
  // Appui (révision du 2026-11-13, FR-021) : le dessin du bouton s'écrase à `down` en `downMs`,
  // puis au relâché rebondit à `up` et revient à 1 en `upMs` au total. La zone ne bouge pas.
  press: { down: 0.96, downMs: 70, up: 1.04, upMs: 160 },
  // Bannière (FR-023) : le portrait de la vedette surgit (0 → 1) et un anneau de sa rareté
  // s'élargit et s'efface.
  portraitPop: 260,
  portraitRing: { scale: 1.6, duration: 320 },
} as const;
