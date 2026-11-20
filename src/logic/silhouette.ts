// Silhouette d'un élément manquant dans la collection (007, FR-004 précisé par FR-025).
// La tête seule remplissait le disque : dix silhouettes sur quatorze n'étaient que des disques
// sombres. On prend le haut de la forme entière (tête, coiffe, oreilles, accessoires) et on la
// pose plus petite que le disque, pour que son contour se découpe sur le fond.

export interface Box { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

// Boîte des pixels dont l'opacité dépasse `alphaMin`, dans des données RGBA de `w` × `h` (celles
// de getImageData) ; null pour une image vide.
export function opaqueBounds(rgba: ArrayLike<number>, w: number, h: number, alphaMin: number): Box | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3]! <= alphaMin) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Cadrage dans un disque de diamètre `d` : `src`, la partie de la forme gardée (un carré de la
// largeur de la boîte, pris en haut ; toute la boîte si elle est plus large que haute) ; `dst`,
// où la peindre : large de `fill` × d, centrée, posée sur le bas du disque. Le buste sort ainsi du
// bas du cadre comme dans un médaillon, et le fond reste visible autour de la tête.
export function silhouetteFrame(bounds: Box, d: number, fill: number): { src: Box; dst: Box } {
  const src = { x: bounds.x, y: bounds.y, w: bounds.w, h: Math.min(bounds.h, bounds.w) };
  const k = (fill * d) / src.w;
  const w = src.w * k;
  const h = src.h * k;
  return { src, dst: { x: (d - w) / 2, y: d - h, w, h } };
}
