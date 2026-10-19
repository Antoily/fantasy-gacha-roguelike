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
  orb: { x: WIDTH / 2, y: 170, r: 64 },
  // Ligne du pity, sous l'orbe (002).
  pityLineY: 250,
  pullSingle: { x: MARGIN, y: 274, w: CONTENT_W, h: 56 },
  pullTen: { x: MARGIN, y: 342, w: CONTENT_W, h: 68 },
  shortageMessageY: 422,
  exchange: { x: MARGIN, y: 476, w: CONTENT_W, h: 48 },
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

// Liste d'échange (002) : grille 2 × 10, assez pour tout le catalogue sans défilement.
export const EXCHANGE = {
  titleY: 36,
  balanceY: 60,
  gridTop: 78,
  cell: { w: half, h: 44 },
  gap: 4,
} as const;

// La fenêtre d'échange se dimensionne d'après le nombre d'éléments manquants : avec un
// seul manquant, pas de grand panneau vide. Vide : une ligne de message.
export function exchangeLayout(count: number): { panel: Rect; close: Rect; emptyY: number } {
  const rows = Math.ceil(count / 2);
  const contentBottom = rows > 0
    ? EXCHANGE.gridTop + rows * (EXCHANGE.cell.h + EXCHANGE.gap) - EXCHANGE.gap
    : EXCHANGE.gridTop + 40;
  const close = { x: MARGIN * 2, y: contentBottom + 16, w: CONTENT_W - 2 * MARGIN, h: 44 };
  const panel = { x: MARGIN / 2, y: MARGIN, w: WIDTH - MARGIN, h: close.y + close.h + MARGIN / 2 - MARGIN };
  return { panel, close, emptyY: EXCHANGE.gridTop + 20 };
}

export function exchangeCellRect(index: number): Rect {
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: MARGIN + col * (EXCHANGE.cell.w + MARGIN),
    y: EXCHANGE.gridTop + row * (EXCHANGE.cell.h + EXCHANGE.gap),
    w: EXCHANGE.cell.w,
    h: EXCHANGE.cell.h,
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
