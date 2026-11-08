import { renderScale } from './layout';

// Échelle de rendu (007, ADR 0007) : le canvas fait 360R × 640R et chaque caméra zoome
// ×R, pour que le jeu agrandi par le navigateur reste net. Fixée au chargement de la page.
export const R = renderScale(window.devicePixelRatio || 1, window.innerWidth, window.innerHeight);
