import type { Rarity } from './gachaConfig';
import { TRANSITIONS } from './ambienceConfig';
import { REVEAL_TIMING } from './revealConfig';

// Bruitages synthétisés (005, ADR 0006) : des « recettes » jouées par src/ui/sfx.ts.
// Provisoires comme la DA : changer un son = changer ces données.

export type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth';

// Filtre d'une voix (révision du 2026-11-13, FR-014) : coupure de départ et, pour un balayage,
// d'arrivée (Hz, rampe exponentielle sur la durée de la note), résonance `q`.
export interface ToneFilter {
  readonly type: 'lowpass' | 'highpass' | 'bandpass';
  readonly freq: number;
  readonly to?: number;
  readonly q?: number;
}

// Enveloppe et placement, communs aux notes et au souffle.
interface Voice {
  // Début et durée, en ms depuis le début du bruitage.
  readonly at: number;
  readonly dur: number;
  // Crête de la note (avant le volume général).
  readonly gain: number;
  // Crescendo : la note va linéairement de `gain` à `gainTo` sur sa durée.
  readonly gainTo?: number;
  // Décroissance après l'attaque (ms, à ~95 %) vers `sustain` × crête (0 par défaut) : c'est
  // ce qui fait « pop » un son percussif, au lieu du plateau d'un orgue.
  readonly decay?: number;
  readonly sustain?: number;
  // Relâche après la fin (ms) ; SOUND_RELEASE_MS sinon. Comptée dans la fin audible.
  readonly release?: number;
  readonly filter?: ToneFilter;
}

// Une note : oscillateur, avec glissando (`to`) et désaccord (`detune`, en cents).
export interface OscTone extends Voice {
  readonly wave: Wave;
  readonly freq: number;
  readonly to?: number;
  readonly detune?: number;
}

// Du souffle : bruit blanc (calculé une fois à graine fixe, src/ui/synth.ts), mis en forme
// par l'enveloppe et le filtre. Pas de hauteur.
export interface NoiseTone extends Voice {
  readonly wave: 'noise';
}

export type Tone = OscTone | NoiseTone;

// Sons d'interface (révision du 2026-11-09, FR-011 à FR-013) : appui, glissement de bannière,
// pièces et éclats qui tintent pendant que leur montant défile.
export type UiCue = 'tap' | 'swish' | 'coins' | 'shards';
export type SynthCue = 'suspense' | 'crack' | `tier:${Rarity}` | 'rise' | 'card' | 'star' | UiCue;

// Notes de do majeur (Hz).
const C5 = 523.25, E5 = 659.25, G5 = 783.99, B5 = 987.77, C6 = 1046.5, E6 = 1318.51, G6 = 1567.98, C7 = 2093, E7 = 2637.02;

const arpeggio = (notes: readonly number[], step: number, dur: number, wave: Wave, gain: number): OscTone[] =>
  notes.map((freq, i) => ({ freq, at: i * step, dur, wave, gain }));

export const SOUND_RECIPES: Readonly<Record<SynthCue, readonly Tone[]>> = {
  // Suspense : une sirène qui monte pendant que l'orbe tremble, et se tait au temps figé
  // (004, révision 2 : FR-016).
  suspense: [{ freq: 220, to: 660, at: 0, dur: REVEAL_TIMING.suspense - REVEAL_TIMING.freeze, wave: 'triangle', gain: 0.5 }],
  // Fissure de l'orbe : un craquement de verre bref, qui tombe vers le grave.
  crack: [
    { freq: 2600, to: 500, at: 0, dur: 70, wave: 'sawtooth', gain: 0.22 },
    { freq: 1900, to: 900, at: 25, dur: 45, wave: 'square', gain: 0.12 },
  ],
  // Paliers : plus haut le rang, plus long et plus aigu l'arpège (FR-001).
  'tier:common': arpeggio([C5], 0, 180, 'square', 0.25),
  'tier:uncommon': arpeggio([C5, E5], 90, 200, 'square', 0.3),
  'tier:rare': arpeggio([C5, E5, G5], 90, 260, 'square', 0.35),
  'tier:legendary': [
    ...arpeggio([C5, E5, G5, C6], 90, 260, 'square', 0.35),
    ...[C5, E5, G5].map(freq => ({ freq, at: 360, dur: 700, wave: 'triangle' as const, gain: 0.3 })),
  ],
  'tier:ultra': [
    ...arpeggio([C5, E5, G5, C6, E6, G6], 80, 260, 'square', 0.35),
    ...[C6, E6, G6].map(freq => ({ freq, at: 480, dur: 900, wave: 'triangle' as const, gain: 0.3 })),
    ...arpeggio([C7, G6, C7, G6], 120, 90, 'sine', 0.25).map(t => ({ ...t, at: t.at + 600 })),
  ],
  // Montée : glissement vers l'aigu quand l'orbe se fend (FR-002).
  rise: [{ freq: 300, to: 1200, at: 0, dur: 250, wave: 'square', gain: 0.35 }],
  // Cartes du ×10 (FR-004).
  card: [{ freq: 880, at: 0, dur: 40, wave: 'triangle', gain: 0.4 }],
  star: arpeggio([G5, C6], 120, 300, 'triangle', 0.5),
  // Interface : gains bien sous ceux des paliers (0,25 à 0,5), pour rester en arrière-plan.
  // Appui : un « pop » montant, très court (FR-011 : 0,1 s au plus).
  // Fin audible, relâche comprise : 45 + 40 ms.
  tap: [{ freq: 520, to: 820, at: 0, dur: 45, wave: 'triangle', gain: 0.18, decay: 35, sustain: 0.4, release: 40 }],
  // Bannière : un glissement rapide vers l'aigu, comme une page qu'on tourne.
  swish: [{ freq: 260, to: 1100, at: 0, dur: 85, wave: 'sine', gain: 0.16, release: 15 }],
  // Pièces : le « si-mi » des pièces de jeu vidéo, trois fois, le temps du défilement.
  coins: [0, 1, 2].flatMap(i => arpeggio([B5, E6], 80, 60, 'square', 0.07).map(t => ({ ...t, at: t.at + i * 180 }))),
  // Éclats : un carillon cristallin qui monte, en tintements brefs. Trois sinus vers 2 kHz, la
  // zone où l'oreille est la plus sensible : à 0,14 et 220 ms, il passait devant les cartes et
  // le Commun en niveau perçu (critique du 2026-11-13).
  shards: arpeggio([G6, C7, E7], 110, 120, 'sine', 0.06).map(t => ({ ...t, decay: 90 })),
};

// Bornes de la spec, vérifiées par les tests : appui et glissement brefs, tintements pas plus
// longs que le défilement de leur montant (007, FR-015).
export const UI_SOUND_LIMITS = { tap: 100, swish: 100, coins: TRANSITIONS.roll, shards: TRANSITIONS.roll } as const;

// Volume général des bruitages, et enveloppe qui évite les clics en début et fin de note.
export const SOUND_MASTER_GAIN = 0.32;
export const SOUND_ATTACK_MS = 5;
export const SOUND_RELEASE_MS = 60;

// Bus maître (révision du 2026-11-13, FR-015) : tout passe par un limiteur avant la sortie,
// pour monter les paliers sans qu'un leurre (rire, faux palier et vrai palier superposés)
// sature. Seuil et genou en dB, attaque et relâche en ms.
export const SOUND_LIMITER = { threshold: -12, knee: 6, ratio: 6, attack: 2, release: 150 } as const;

// Coupure (FR-016) : passer ou couper le son éteint tout en fondu, sans claquement, et bien
// sous les 30 ms de la spec.
export const SOUND_STOP_FADE_MS = 25;

// Étouffement (FR-019) : quand la montée ou le rire arrive, les voix encore actives du faux
// palier (`tier:*`) s'effacent en `ms` ; `pitch` < 1 les fait aussi descendre, comme une bande
// qui ralentit (le leurre se dégonfle). Pendant le rire, le vrai palier fait baisser le rire
// (`laughDuck`) pour qu'on l'entende sous la moquerie.
export const SOUND_CHOKES = {
  rise: { ms: 60, pitch: 1 },
  laugh: { ms: 300, pitch: 0.5 },
} as const satisfies Record<string, { ms: number; pitch: number }>;
export const LAUGH_DUCK = { ms: 80, gain: 0.5 } as const;

// Pétillement de l'effet qui se dégonfle, joué avec le rire (hors journal : c'est la même
// réaction que le rire).
export const DEFLATE: readonly Tone[] = [
  { wave: 'noise', at: 0, dur: 300, gain: 0.15, filter: { type: 'lowpass', freq: 2000, to: 200 } },
];

// Enregistrements (public/sounds/, CREDITS.md) : le rire du leurre (FR-003, FR-010).
export const LAUGH = { key: 'rire', urls: ['sounds/rire-diabolique.ogg', 'sounds/rire-diabolique.mp3'], gain: 0.65 } as const;

// Fin audible d'une note, relâche comprise (ms depuis le début du bruitage).
export const toneEnd = (t: Tone): number => t.at + t.dur + (t.release ?? SOUND_RELEASE_MS);
export const recipeEnd = (tones: readonly Tone[]): number => Math.max(...tones.map(toneEnd));

// Puissance moyenne de chaque forme d'onde à amplitude 1 (carré 1, sinus 1/2, triangle, scie
// et bruit blanc uniforme 1/3).
const WAVE_POWER: Record<Tone['wave'], number> = { square: 1, sine: 1 / 2, triangle: 1 / 3, sawtooth: 1 / 3, noise: 1 / 3 };

// Énergie d'une note : ∫ enveloppe² × puissance de l'onde (unités arbitraires, en s). Sert à
// comparer des bruitages en niveau perçu, ce que ne fait pas le gain de crête : trois tintements
// longs à gain faible pèsent plus qu'un tic bref à gain fort. Intégration numérique, au pas de
// 1 ms, de la même enveloppe que src/ui/synth.ts (attaque, décroissance ou crescendo, relâche).
export function toneEnergy(t: Tone): number {
  const dt = 0.001;
  const attack = SOUND_ATTACK_MS / 1000, dur = t.dur / 1000, release = (t.release ?? SOUND_RELEASE_MS) / 1000;
  let sum = 0;
  let atEnd = 0;
  for (let x = 0; x < dur; x += dt) {
    let g: number;
    if (x < attack) g = t.gain * (x / attack);
    else if (t.decay !== undefined) {
      const floor = t.gain * (t.sustain ?? 0);
      g = floor + (t.gain - floor) * Math.exp(-(x - attack) / (t.decay / 1000 / 3));
    } else if (t.gainTo !== undefined) g = t.gain + (t.gainTo - t.gain) * ((x - attack) / (dur - attack));
    else g = t.gain;
    sum += g * g * dt;
    atEnd = g;
  }
  // Relâche exponentielle (τ = relâche / 5, src/ui/synth.ts) : ∫ (g e^(-x/τ))² = g² τ / 2.
  sum += (atEnd * atEnd * release) / 10;
  return sum * WAVE_POWER[t.wave];
}
export const recipeEnergy = (tones: readonly Tone[]): number => tones.reduce((s, t) => s + toneEnergy(t), 0);
