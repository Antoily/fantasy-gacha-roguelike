import { describe, expect, it } from 'vitest';
import { bannerList, findBanner, neighbourBanner, STANDARD } from './banners';

describe('liste des bannières (FR-001)', () => {
  it('met la standard en tête, puis un Légendaire ou Ultra rare par bannière, dans l’ordre du catalogue', () => {
    expect(bannerList().map(b => b.id)).toEqual(
      [STANDARD, 'roi-barbichon', 'marquise-cerise', 'tonnerrouf', 'cosmo-l-infini', 'orbulle'],
    );
    expect(findBanner(STANDARD)!.featured).toBeNull();
    for (const b of bannerList().slice(1)) expect(b.featured!.id).toBe(b.id);
  });

  it('ne connaît pas de bannière pour un Rare', () => {
    expect(findBanner('flambichon')).toBeUndefined();
  });
});

describe('bannière voisine (FR-004)', () => {
  it('passe à la suivante et à la précédente', () => {
    expect(neighbourBanner(STANDARD, 1).id).toBe('roi-barbichon');
    expect(neighbourBanner('tonnerrouf', -1).id).toBe('marquise-cerise');
  });

  it('tourne en boucle dans les deux sens', () => {
    expect(neighbourBanner('orbulle', 1).id).toBe(STANDARD);
    expect(neighbourBanner(STANDARD, -1).id).toBe('orbulle');
  });

  it('atteint chaque bannière en au plus 3 appuis (SC-004)', () => {
    const n = bannerList().length;
    for (const target of bannerList()) {
      let fwd = STANDARD;
      let steps = 0;
      while (fwd !== target.id) { fwd = neighbourBanner(fwd, 1).id; steps++; }
      expect(Math.min(steps, n - steps), target.id).toBeLessThanOrEqual(3);
    }
  });
});
