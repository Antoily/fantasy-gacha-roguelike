import { describe, expect, it } from 'vitest';
import { clipPolygon, glossBand, rollAmount, roundedRectPolygon, type Point } from './motion';

describe('rollAmount', () => {
  it('part de l’ancienne valeur et finit exactement sur la nouvelle', () => {
    expect(rollAmount(9000, 8900, 0)).toBe(9000);
    expect(rollAmount(9000, 8900, 1)).toBe(8900);
    expect(rollAmount(0, 7, 0.999)).toBe(7);
  });

  it('reste borné hors de [0, 1]', () => {
    expect(rollAmount(100, 200, -0.5)).toBe(100);
    expect(rollAmount(100, 200, 1.5)).toBe(200);
  });

  it('passe par des entiers intermédiaires, dans l’ordre, à la hausse comme à la baisse', () => {
    const up = [0.25, 0.5, 0.75].map(t => rollAmount(0, 150, t));
    expect(up).toEqual([38, 75, 113]);
    const down = [0.25, 0.5, 0.75].map(t => rollAmount(9000, 8000, t));
    expect(down).toEqual([8750, 8500, 8250]);
  });
});

// Aire signée (formule du lacet) : positive en sens horaire à l'écran (y vers le bas).
const area = (pts: readonly Point[]) =>
  pts.reduce((a, [x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length]!;
    return a + (x * ny - nx * y) / 2;
  }, 0);

const BTN = { x: 16, y: 292, w: 328, h: 56 };

describe('roundedRectPolygon', () => {
  it('épouse le rectangle sans ses coins', () => {
    const pts = roundedRectPolygon(BTN, 12, 16);
    expect(area(pts)).toBeCloseTo(BTN.w * BTN.h - (4 - Math.PI) * 144, -1);
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(BTN.x - 1e-9);
      expect(x).toBeLessThanOrEqual(BTN.x + BTN.w + 1e-9);
      expect(y).toBeGreaterThanOrEqual(BTN.y - 1e-9);
      expect(y).toBeLessThanOrEqual(BTN.y + BTN.h + 1e-9);
    }
    // Le coin pointu n'en fait pas partie.
    expect(pts.some(([x, y]) => x === BTN.x && y === BTN.y)).toBe(false);
  });
});

describe('clipPolygon', () => {
  const square = (x: number, y: number, s: number): Point[] => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];

  it('garde la seule partie commune', () => {
    expect(area(clipPolygon(square(5, 0, 10), square(0, 0, 10)))).toBeCloseTo(50);
    expect(area(clipPolygon(square(2, 2, 4), square(0, 0, 10)))).toBeCloseTo(16);
  });

  it('rend vide ce qui est dehors', () => {
    expect(clipPolygon(square(20, 0, 5), square(0, 0, 10))).toEqual([]);
  });
});

describe('glossBand', () => {
  const band = (p: number) => glossBand(BTN, 12, 26, 30, p);

  it('entre par la gauche et sort par la droite : rien aux extrémités', () => {
    expect(band(0)).toEqual([]);
    expect(band(1)).toEqual([]);
  });

  it('au milieu, toute la bande est sur le bouton', () => {
    expect(area(band(0.5))).toBeCloseTo(26 * BTN.h);
  });

  it('avance de gauche à droite', () => {
    const cx = (pts: Point[]) => pts.reduce((a, [x]) => a + x, 0) / pts.length;
    const xs = [0.2, 0.4, 0.6, 0.8].map(p => cx(band(p)));
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(xs[3]! - xs[0]!).toBeGreaterThan(BTN.w / 2);
  });

  it('ne déborde pas des coins arrondis', () => {
    // Bande qui entre : elle touche le coin bas gauche.
    for (const p of [0.03, 0.06, 0.1, 0.95]) {
      for (const [x, y] of band(p)) {
        const cx = Math.min(Math.max(x, BTN.x + 12), BTN.x + BTN.w - 12);
        const cy = Math.min(Math.max(y, BTN.y + 12), BTN.y + BTN.h - 12);
        expect(Math.hypot(x - cx, y - cy)).toBeLessThanOrEqual(12 + 1e-6);
      }
    }
    expect(band(0.03).length).toBeGreaterThan(0);
  });
});
