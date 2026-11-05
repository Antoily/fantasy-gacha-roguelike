import { describe, expect, it } from 'vitest';
import { renderScale } from './layout';

describe('échelle de rendu (007, ADR 0007)', () => {
  it('écran de référence à densité 1 : rendu inchangé', () => {
    expect(renderScale(1, 360, 640)).toBe(1);
    // Fenêtre à peine plus grande : pas de double rendu pour un arrondi.
    expect(renderScale(1, 372, 660)).toBe(1);
  });

  it('agrandi par le navigateur ou haute densité : rendu plus fin', () => {
    expect(renderScale(1, 1920, 950)).toBe(2);
    expect(renderScale(2, 360, 640)).toBe(2);
  });

  it('borné à [1, 3]', () => {
    expect(renderScale(3, 390, 844)).toBe(3);
    expect(renderScale(4, 1440, 2560)).toBe(3);
    expect(renderScale(1, 200, 300)).toBe(1);
  });
});
