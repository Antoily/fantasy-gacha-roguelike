import { describe, expect, it } from 'vitest';
import { BANNER, GACHA, bannerTextArea, renderScale } from './layout';
import { STROKE } from './theme';

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

// Révision du 2026-11-08 : « Ultra rare · pas encore obtenu » passait sous le portrait et le cadre.
describe('place des textes du bandeau de bannière', () => {
  const b = GACHA.banner;
  const frameInner = b.x + b.w - STROKE.base;

  it('vedette : après le portrait, sans toucher le cadre', () => {
    const a = bannerTextArea(true);
    expect(a.x).toBeGreaterThan(b.x + BANNER.portraitX + BANNER.portraitD / 2);
    expect(a.x + a.w).toBeLessThanOrEqual(frameInner);
  });

  it('standard : toute la largeur, sans toucher le cadre', () => {
    const a = bannerTextArea(false);
    expect(a.x).toBeGreaterThanOrEqual(b.x + STROKE.base);
    expect(a.x + a.w).toBeLessThanOrEqual(frameInner);
    expect(a.w).toBeGreaterThan(bannerTextArea(true).w + BANNER.portraitD);
  });
});
