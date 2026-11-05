// Géométrie de l'écran (360 × 640). Constantes pures, sans Phaser : partagées par les
// scènes et par le test de bout en bout, qui clique aux mêmes coordonnées.

export const WIDTH = 360;
export const HEIGHT = 640;
export const MARGIN = 16;
export const CONTENT_W = WIDTH - 2 * MARGIN;

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

export const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// Échelle de rendu (007, ADR 0007) : densité de l'écran × agrandissement du mode FIT,
// arrondie au-dessus et bornée à [1, 3]. La tolérance évite de doubler le rendu pour un
// écart d'arrondi (fenêtre à peine plus grande que 360 × 640).
export function renderScale(dpr: number, viewportW: number, viewportH: number): number {
  const fit = Math.min(viewportW / WIDTH, viewportH / HEIGHT);
  return Math.min(3, Math.max(1, Math.ceil(dpr * fit - 0.05)));
}

// Illustrations (007) : plus grandes tailles d'affichage, pour les rastériser assez net.
// `full` sert à la présentation plein écran ; la carte ×1 l'affiche plus petite.
export const ART = {
  full: { w: 300, h: 375 },
  head: 32,
  bust: { w: 48, h: 60, radius: 7 },
} as const;

const half = (CONTENT_W - MARGIN) / 2;

export const GACHA = {
  header: { x: MARGIN, y: MARGIN, w: CONTENT_W, h: 52 },
  // Bannière (006), sous l'en-tête, à gauche du bouton son : ◀ nom ▶.
  bannerPrev: { x: MARGIN, y: 76, w: 40, h: 40 },
  banner: { x: MARGIN + 44, y: 76, w: 188, h: 40 },
  bannerNext: { x: MARGIN + 236, y: 76, w: 40, h: 40 },
  // Bouton son (005), sous l'en-tête à droite, à l'écart de l'orbe.
  mute: { x: WIDTH - MARGIN - 44, y: 76, w: 44, h: 40 },
  // Orbe réduit en 006 pour laisser la place au bandeau de bannière.
  orb: { x: WIDTH / 2, y: 182, r: 54 },
  // Ligne du pity, sous l'orbe (002), puis celle de la garantie vedette (006).
  pityLineY: 252,
  featuredLineY: 272,
  pullSingle: { x: MARGIN, y: 292, w: CONTENT_W, h: 56 },
  pullTen: { x: MARGIN, y: 358, w: CONTENT_W, h: 68 },
  shortageMessageY: 436,
  collection: { x: MARGIN, y: 486, w: CONTENT_W, h: 48 },
  rates: { x: MARGIN, y: 560, w: half, h: 48 },
  reset: { x: MARGIN * 2 + half, y: 560, w: half, h: 48 },
} as const satisfies Record<string, unknown>;

// Fenêtre de résultats : ×10 en grille 2 × 5, dans l'ordre du tirage.
export const RESULTS = {
  panel: { x: MARGIN / 2, y: MARGIN, w: WIDTH - MARGIN, h: HEIGHT - 2 * MARGIN },
  titleY: 44,
  gridTop: 72,
  card: { w: half, h: 92 },
  gap: 8,
  // Carte du ×1 (007) : fenêtre d'illustration en haut, textes dessous.
  single: { x: (WIDTH - 260) / 2, y: 100, w: 260, h: 420 },
  singleArt: { pad: 12, h: 272 },
  ok: { x: MARGIN * 2, y: 568, w: CONTENT_W - 2 * MARGIN, h: 44 },
} as const;

// Révélation (004) : l'orbe quitte sa place pour le centre de l'écran, où éclatent
// les paliers. Ampleur par rang de rareté (0 = Commun … 4 = Ultra rare, FR-004).
export const REVEAL = {
  center: { x: WIDTH / 2, y: 300 },
  orbScale: 1.3,
  rays: [6, 8, 10, 12, 16],
  rayLength: [96, 120, 144, 168, 200],
  wave: [120, 150, 190, 240, 300],
  pulse: [1.05, 1.1, 1.18, 1.26, 1.36],
  // Particules (révision du 2026-10-26) : nombre et vitesse maximale (px/s) de
  // l'explosion du palier, puis de l'éclat d'une carte retournée.
  // Révision 2 (2026-10-30, FR-017) : deux fois plus qu'à la révision du 2026-10-26.
  burst: [32, 60, 100, 160, 240],
  burstSpeed: [170, 210, 270, 330, 400],
  cardBurst: [10, 20, 36, 60, 88],
  // Éclats de verre de l'orbe brisée et lueurs, par rang.
  shards: [14, 18, 24, 30, 36],
  glows: [4, 6, 9, 12, 16],
  // Cercle magique sous l'orbe (diamètre) et sa rotation pendant le suspense (degrés).
  circle: 300,
  circleTurn: 90,
  // Rebond d'une carte retournée.
  cardBounce: [1, 1.04, 1.08, 1.12, 1.16],
  labelY: 510,
  hintY: 600,
  // Toute la fenêtre : un appui n'importe où passe l'animation (FR-006).
  skip: { x: 0, y: 0, w: WIDTH, h: HEIGHT },
} as const;

// Présentation plein écran d'un Légendaire ou Ultra rare (007, FR-003).
export const SPLASH = {
  art: { x: WIDTH / 2, y: 262, w: ART.full.w, h: ART.full.h },
  nameY: 470,
  rarityY: 506,
  blurb: { x: MARGIN * 2, y: 530, w: CONTENT_W - 2 * MARGIN, h: 52 },
  badgeY: 84,
  hintY: 612,
  // Un appui ne ferme la présentation qu'une fois l'illustration entrée.
  armMs: 400,
} as const;

// Collection (003, remplace la liste d'échange de 002) : les 20 éléments en grille
// 2 × 10, un résumé par rareté, sans défilement.
export const COLLECTION = {
  titleY: 36,
  balanceY: 60,
  summaryY: 82,
  gridTop: 100,
  cell: { w: half, h: 42 },
  gap: 4,
  completeY: 86,
  close: { x: MARGIN * 2, y: 568, w: CONTENT_W - 2 * MARGIN, h: 44 },
} as const;

export function collectionCellRect(index: number): Rect {
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: MARGIN + col * (COLLECTION.cell.w + MARGIN),
    y: COLLECTION.gridTop + row * (COLLECTION.cell.h + COLLECTION.gap),
    w: COLLECTION.cell.w,
    h: COLLECTION.cell.h,
  };
}

export function resultCardRect(index: number): Rect {
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: MARGIN + col * (RESULTS.card.w + MARGIN),
    y: RESULTS.gridTop + row * (RESULTS.card.h + RESULTS.gap),
    w: RESULTS.card.w,
    h: RESULTS.card.h,
  };
}

// Petites fenêtres (taux, confirmation, avertissement) : centrées, hauteur selon le contenu.
export const DIALOG = {
  w: CONTENT_W,
  // Boutons du bas d'une fenêtre de hauteur h centrée : voir dialogButtons().
  buttonH: 44,
  padding: 20,
} as const;

export function dialogRect(h: number): Rect {
  return { x: MARGIN, y: Math.round((HEIGHT - h) / 2), w: DIALOG.w, h };
}

// Un ou deux boutons alignés en bas d'une fenêtre.
export function dialogButtons(dialog: Rect, count: 1 | 2): Rect[] {
  const y = dialog.y + dialog.h - DIALOG.padding - DIALOG.buttonH;
  const inner = dialog.w - 2 * DIALOG.padding;
  if (count === 1) return [{ x: dialog.x + DIALOG.padding, y, w: inner, h: DIALOG.buttonH }];
  const w = (inner - MARGIN) / 2;
  return [
    { x: dialog.x + DIALOG.padding, y, w, h: DIALOG.buttonH },
    { x: dialog.x + DIALOG.padding + w + MARGIN, y, w, h: DIALOG.buttonH },
  ];
}

// Hauteurs des fenêtres, partagées avec l'e2e pour viser leurs boutons.
export const RATES_DIALOG_H = 400;
// Sur une bannière vedette, la fenêtre des taux gagne la ligne de la vedette et la règle du 50/50.
export const ratesDialogH = (featured: boolean) => (featured ? RATES_DIALOG_H + 112 : RATES_DIALOG_H);
export const CONFIRM_DIALOG_H = 156;
export const WARNING_DIALOG_H = 156;
