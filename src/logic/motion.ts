// Montant affiché pendant qu'il défile (007, révision du 2026-11-09 : FR-015).
// progress de 0 à 1 ; hors bornes, la valeur reste celle du départ ou de l'arrivée, et
// l'arrivée est exacte : les montants sont entiers.
export function rollAmount(from: number, to: number, progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return Math.round(from + (to - from) * t);
}

// Reflet des tirages payables (007, révision du 2026-11-13 : FR-021). Une bande oblique
// traverse le bouton ; on la découpe à la forme du bouton (coins arrondis compris) plutôt que
// de la masquer : un masque coûte un passage de rendu à chaque image (Phaser 4).
export type Point = readonly [number, number];
export interface Box { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

// Rectangle aux coins arrondis en polygone convexe (sens horaire), `steps` segments par coin.
export function roundedRectPolygon(r: Box, radius: number, steps = 4): Point[] {
  const rad = Math.max(0, Math.min(radius, r.w / 2, r.h / 2));
  const corners: [number, number, number][] = [
    [r.x + r.w - rad, r.y + rad, -Math.PI / 2],
    [r.x + r.w - rad, r.y + r.h - rad, 0],
    [r.x + rad, r.y + r.h - rad, Math.PI / 2],
    [r.x + rad, r.y + rad, Math.PI],
  ];
  const pts: Point[] = [];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (i / steps) * (Math.PI / 2);
      pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
    }
  }
  return pts;
}

// Sutherland–Hodgman : `subject` découpé par le polygone convexe `clip` (sens horaire à l'écran,
// y vers le bas). Rend [] quand ils ne se touchent pas.
export function clipPolygon(subject: readonly Point[], clip: readonly Point[]): Point[] {
  let out: Point[] = [...subject];
  for (let i = 0; i < clip.length && out.length > 0; i++) {
    const [ax, ay] = clip[i]!;
    const [bx, by] = clip[(i + 1) % clip.length]!;
    // Côté intérieur d'une arête parcourue en sens horaire (y vers le bas) : produit vectoriel ≥ 0.
    const inside = ([px, py]: Point) => (bx - ax) * (py - ay) - (by - ay) * (px - ax) >= 0;
    const cross = ([px, py]: Point, [qx, qy]: Point): Point => {
      const d = (bx - ax) * (qy - py) - (by - ay) * (qx - px);
      const t = ((bx - ax) * (ay - py) - (by - ay) * (ax - px)) / d;
      return [px + t * (qx - px), py + t * (qy - py)];
    };
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j]!;
      const q = input[(j + 1) % input.length]!;
      if (inside(q)) {
        if (!inside(p)) out.push(cross(p, q));
        out.push(q);
      } else if (inside(p)) {
        out.push(cross(p, q));
      }
    }
  }
  return out;
}

// Bande du reflet à l'avancée `progress` (0 : entièrement à gauche du bouton, 1 : entièrement
// à droite), large de `width`, penchée de `slant` px (haut décalé vers la droite), découpée
// à la forme du bouton.
export function glossBand(r: Box, radius: number, width: number, slant: number, progress: number): Point[] {
  const start = r.x - width - slant;
  const left = start + (r.x + r.w - start) * progress;
  const top = r.y;
  const bottom = r.y + r.h;
  const band: Point[] = [
    [left + slant, top], [left + slant + width, top], [left + width, bottom], [left, bottom],
  ];
  return clipPolygon(band, roundedRectPolygon(r, radius));
}
