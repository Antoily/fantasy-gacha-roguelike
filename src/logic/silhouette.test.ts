import { describe, expect, it } from 'vitest';
import { opaqueBounds, silhouetteFrame } from './silhouette';

// Image RGBA de w × h dont seuls les pixels listés ont l'opacité donnée.
function image(w: number, h: number, pixels: readonly [number, number, number][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (const [x, y, a] of pixels) data[(y * w + x) * 4 + 3] = a;
  return data;
}

describe('opaqueBounds', () => {
  it('encadre exactement les pixels opaques, bords compris', () => {
    const data = image(10, 8, [[2, 1, 255], [7, 1, 255], [4, 6, 200]]);
    expect(opaqueBounds(data, 10, 8, 40)).toEqual({ x: 2, y: 1, w: 6, h: 6 });
  });

  it('ignore les pixels presque transparents (bords adoucis, poussière)', () => {
    const data = image(10, 8, [[0, 0, 40], [9, 7, 10], [5, 4, 41]]);
    expect(opaqueBounds(data, 10, 8, 40)).toEqual({ x: 5, y: 4, w: 1, h: 1 });
  });

  it('un pixel opaque dans le dernier coin compte', () => {
    expect(opaqueBounds(image(4, 3, [[3, 2, 255]]), 4, 3, 40)).toEqual({ x: 3, y: 2, w: 1, h: 1 });
  });

  it('une ligne continue compte jusqu’à son dernier pixel', () => {
    const data = image(8, 2, [[3, 0, 255], [4, 0, 255]]);
    expect(opaqueBounds(data, 8, 2, 40)).toEqual({ x: 3, y: 0, w: 2, h: 1 });
  });

  it('image vide : aucune boîte', () => {
    expect(opaqueBounds(image(4, 4, []), 4, 4, 40)).toBeNull();
  });
});

describe('silhouetteFrame', () => {
  it('forme haute : on garde le carré du haut, posé sur le bas du disque, plus étroit que lui', () => {
    const { src, dst } = silhouetteFrame({ x: 40, y: 20, w: 300, h: 460 }, 64, 0.8);
    expect(src).toEqual({ x: 40, y: 20, w: 300, h: 300 });
    expect(dst.w).toBeCloseTo(51.2);
    expect(dst.h).toBeCloseTo(51.2);
    // Centrée, et le bas de la forme touche le bas du disque.
    expect(dst.x).toBeCloseTo((64 - 51.2) / 2);
    expect(dst.y + dst.h).toBeCloseTo(64);
    // Le haut du disque reste libre : la tête s'y découpe.
    expect(dst.y).toBeGreaterThan(10);
  });

  it('forme large : toute la boîte, sans déformation', () => {
    const { src, dst } = silhouetteFrame({ x: 0, y: 100, w: 400, h: 200 }, 64, 0.8);
    expect(src).toEqual({ x: 0, y: 100, w: 400, h: 200 });
    expect(dst.w / dst.h).toBeCloseTo(2);
    expect(dst.y + dst.h).toBeCloseTo(64);
  });
});
