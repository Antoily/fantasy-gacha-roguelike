// Réglages du joueur (005, ADR 0006) : préférence de l'appareil, hors sauvegarde de
// partie. « Recommencer » ne les touche pas.
export const SETTINGS_KEY = 'gacha.settings';

export interface Settings {
  readonly muted: boolean;
}

export const DEFAULT_SETTINGS: Settings = { muted: false };

// Lecture défensive : absent, illisible ou mal typé ⇒ réglages par défaut.
export function parseSettings(raw: string | null): Settings {
  if (raw === null) return DEFAULT_SETTINGS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data === 'object' && data !== null && typeof (data as { muted?: unknown }).muted === 'boolean') {
      return { muted: (data as { muted: boolean }).muted };
    }
  } catch {
    // JSON cassé : on retombe sur le défaut.
  }
  return DEFAULT_SETTINGS;
}

export function serializeSettings(s: Settings): string {
  return JSON.stringify({ muted: s.muted });
}
