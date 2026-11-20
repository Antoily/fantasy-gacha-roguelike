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

// Fenêtres (007, révision du 2026-11-13 : FR-024, FR-025), en ms. Toute ouverture finit en
// 250 ms au plus (FR-024) : le pouls du coût et la lévitation de la fiche, qui suivent, sont des
// boucles, pas des ouvertures.
export const WINDOW = {
  // Le dessin du panneau passe de `from` à 1 autour de son centre, avec un léger dépassement
  // (Back, `overshoot`) ; l'opacité suit TRANSITIONS.fade. Les zones d'appui ne bougent pas.
  pop: { from: 0.94, duration: 180, overshoot: 1.4 },
  // Taux : chaque ligne glisse de `shift` px en s'allumant, `stagger` ms après la précédente.
  rows: { stagger: 30, duration: 120, shift: 8 },
  // Collection : les cases arrivent rangée par rangée (10 rangées : 9 × step + duration ≤ 250),
  // en montant de `rise` px ; les compteurs du résumé montent de 0 en `count` ms.
  cascade: { step: 11, duration: 150, rise: 8 },
  count: 200,
  // Coût d'un manquant échangeable : il pulse jusqu'à `scale` (aller simple en `period` ms).
  costPulse: { scale: 1.08, period: 600 },
  // Fiche : l'illustration naît de la case touchée à l'échelle `from`, se pose en `fly` ms, puis
  // flotte de ±`float` px (aller simple en `floatPeriod` ms).
  sheet: { from: 0.6, fly: 240, float: 3, floatPeriod: 1500 },
  // Échange : des éclats volent du compteur de l'en-tête jusqu'à la carte (`flight` ms chacun,
  // `stagger` ms d'écart), et le montant dépensé s'élève de `rise` px en s'effaçant.
  exchange: { count: 10, flight: 420, stagger: 24, spread: 18, rise: 22, label: 700 },
} as const;

// Silhouette d'un manquant (FR-025) : largeur de la forme en part du disque, opacité minimale
// d'un pixel compté dans la forme (0–255), largeur de l'image réduite où on la mesure.
export const SILHOUETTE = { fill: 0.84, alphaMin: 40, probeW: 100 } as const;
