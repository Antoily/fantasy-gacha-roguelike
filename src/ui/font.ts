import { FONT_FACE } from './theme';

// Au-delà, l'écran s'ouvre avec la police de repli plutôt que d'attendre (007, SC-004).
const FONT_TIMEOUT_MS = 2000;

// Police du jeu (ADR 0008), à charger AVANT le premier texte : Phaser dessine et mesure ses
// textes avec la police disponible à leur création, et ne les refait pas quand elle arrive.
// Un échec (fichier absent, page d'accueil renvoyée à sa place, délai) laisse la pile de
// repli de FONT_FAMILY, sans erreur. Signal pour l'e2e : dataset.font.
export async function loadFont(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const face = new FontFace(FONT_FACE.family, `url(${FONT_FACE.url})`, { weight: FONT_FACE.weight });
    const late = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('police trop lente')), FONT_TIMEOUT_MS);
    });
    document.fonts.add(await Promise.race([face.load(), late]));
    document.body.dataset.font = 'ready';
  } catch {
    document.body.dataset.font = 'fallback';
  } finally {
    clearTimeout(timer);
  }
}
