// Géométrie de l'écran (360 × 640). Constantes pures, sans Phaser : partagées par les
// scènes et par le test de bout en bout, qui clique aux mêmes coordonnées.

export const WIDTH = 360;
export const HEIGHT = 640;
export const MARGIN = 16;
export const CONTENT_W = WIDTH - 2 * MARGIN;

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

export const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

const half = (CONTENT_W - MARGIN) / 2;

export const GACHA = {
  header: { x: MARGIN, y: MARGIN, w: CONTENT_W, h: 52 },
  // Bouton son (005), sous l'en-tête à droite, à l'écart de l'orbe.
  mute: { x: WIDTH - MARGIN - 44, y: 76, w: 44, h: 40 },
  orb: { x: WIDTH / 2, y: 170, r: 64 },
  // Ligne du pity, sous l'orbe (002).
  pityLineY: 250,
  pullSingle: { x: MARGIN, y: 274, w: CONTENT_W, h: 56 },
  pullTen: { x: MARGIN, y: 342, w: CONTENT_W, h: 68 },
  shortageMessageY: 422,
  collection: { x: MARGIN, y: 476, w: CONTENT_W, h: 48 },
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
  single: { x: (WIDTH - 260) / 2, y: 160, w: 260, h: 224 },
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
  labelY: 510,
  hintY: 600,
  // Toute la fenêtre : un appui n'importe où passe l'animation (FR-006).
  skip: { x: 0, y: 0, w: WIDTH, h: HEIGHT },
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
export const CONFIRM_DIALOG_H = 156;
export const WARNING_DIALOG_H = 156;
