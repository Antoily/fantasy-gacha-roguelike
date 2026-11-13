import { expect, test } from '@playwright/test';
import { GACHA } from '../../src/ui/layout';
import { FRESH, contrastIn, loadWith, start } from './helpers';

// Densité 2 : le défaut d'ordre d'affichage ne se voyait pas à densité 1 (rendu des textes ×R).
test.use({ deviceScaleFactor: 2 });

test.beforeEach(async ({ page }) => {
  await start(page);
});

// Rapport visuel D1 : le bandeau clair était créé après le message de pénurie et le couvrait
// (texte à ~1,3:1). Zone prise dans le texte, donc entièrement sous le bandeau.
test('le message « plus assez de pièces » reste lisible sur son bandeau (FR-008)', async ({ page }) => {
  await loadWith(page, { ...FRESH, currency: 50 });
  const zone = { x: GACHA.pullSingle.x + 24, y: GACHA.shortageMessageY + 2, w: GACHA.pullSingle.w - 48, h: 32 };
  expect(await contrastIn(page, zone)).toBeGreaterThanOrEqual(4.5);
});
