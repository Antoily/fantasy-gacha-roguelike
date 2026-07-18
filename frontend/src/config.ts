export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

// Thème « BD claire » : fond papier, aplats francs, gros contours noirs.
// Toute couleur affichée doit venir d'ici — pas de valeur 0x… en dur dans les scènes,
// sinon un changement de thème redevient un chantier de 13 fichiers.
export const COLORS = {
  background: 0xf4ecd8,   // papier crème
  backgroundAlt: 0xe8dcc0, // papier plus soutenu (fonds de salle)
  panel: 0xffffff,
  panelBorder: 0x1a1a1a,  // le contour est noir, c'est la signature du style
  ink: 0x1a1a1a,          // noir d'encre — contours et texte principal
  accent: 0xff6b35,       // orange vif
  accentLight: 0xffa06b,
  secondary: 0x4ecdc4,    // turquoise
  gold: 0xffc93c,
  hp: 0x3ec46d,
  hpLow: 0xff4d4d,
  text: 0x1a1a1a,
  textLight: 0xffffff,    // texte posé sur un aplat coloré
  textDim: 0x7a7266,      // gris chaud, lisible sur le papier
  textFaint: 0xb3a992,    // éléments désactivés / verrouillés
  rarity: {
    common: 0x7d7d7d,
    rare: 0x3d9bff,
    epic: 0xb04eff,
    legendary: 0xff9500,
  },
  // Variantes de boutons et d'aplats — nommées par intention, pas par teinte
  btn: {
    primary: 0xff6b35,
    secondary: 0x4ecdc4,
    success: 0x3ec46d,
    danger: 0xe63946,
    magic: 0xb04eff,
    gold: 0xffc93c,
    neutral: 0xc9c2b4,
    disabled: 0xd6d0c4,
  },
  // Voile des modales et écrans de résultat. Clair, pas noir : un voile sombre
  // vire au brun sur le papier et casse le thème.
  scrim: 0xf4ecd8,
  // Fonds d'écran de fin de run
  result: {
    win: 0xdcefe0,   // vert pâle
    lose: 0xf2d3d8,  // rose pâle
  },
  // Camps en combat — deux teintes de papier, distinguées par la couleur, pas par la valeur
  side: {
    hero: 0xdde8f5,   // bleu pâle
    enemy: 0xf6ded2,  // rose pâle
  },
  // Tracks de l'arbre de talents
  track: {
    survival: 0x3ec46d,
    power: 0xff6b35,
    fortune: 0xffc93c,
  },
} as const;

// Équivalents CSS (les styles de texte Phaser veulent des chaînes)
export const CSS = {
  ink: '#1a1a1a',
  text: '#1a1a1a',
  textLight: '#ffffff',
  textDim: '#7a7266',
  textFaint: '#b3a992',
  accent: '#ff6b35',
  secondary: '#4ecdc4',
  gold: '#ffc93c',
  hp: '#3ec46d',
  hpLow: '#ff4d4d',
  danger: '#e63946',
  magic: '#b04eff',
  rarity: {
    common: '#7d7d7d',
    rare: '#3d9bff',
    epic: '#b04eff',
    legendary: '#ff9500',
  },
} as const;

// Épaisseurs de contour — le trait épais est ce qui « fait BD »
export const STROKE = {
  thin: 2,
  base: 3,
  thick: 4,
} as const;

// Pile de polices arrondies : Comic Sans existe sur desktop, Comic Neue et
// Chalkboard couvrent le reste, Trebuchet est le repli le moins anguleux.
const COMIC = '"Comic Sans MS", "Comic Neue", "Chalkboard SE", "Trebuchet MS", sans-serif';

export const FONTS = {
  title: { fontFamily: COMIC, fontSize: '28px', color: CSS.textLight, fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 6 },
  body: { fontFamily: COMIC, fontSize: '14px', color: CSS.text, fontStyle: 'bold' },
  small: { fontFamily: COMIC, fontSize: '11px', color: CSS.textDim, fontStyle: 'bold' },
  gold: { fontFamily: COMIC, fontSize: '16px', color: CSS.gold, fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 4 },
  button: { fontFamily: COMIC, fontSize: '16px', color: CSS.textLight, fontStyle: 'bold', stroke: CSS.ink, strokeThickness: 4 },
} as const;

export const FONT_FAMILY = COMIC;

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
