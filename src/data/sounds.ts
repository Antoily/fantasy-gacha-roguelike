import { mulberry32 } from '../logic/rng';
import { beatTimes, crackTimes } from '../logic/soundCues';
import type { Rarity } from './gachaConfig';
import { TRANSITIONS } from './ambienceConfig';
import { REVEAL_MOTION, REVEAL_TIMING } from './revealConfig';

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
  // Creux (ms depuis le début du bruitage) : la note s'efface un instant (SOUND_DIP) puis
  // reprend son crescendo ou son plateau. La sirène laisse ainsi passer chaque fissure.
  readonly dips?: readonly number[];
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
const C5 = 523.25, E5 = 659.25, G5 = 783.99, B5 = 987.77, C6 = 1046.5, E6 = 1318.51, G6 = 1567.98,
  C7 = 2093, D7 = 2349.32, E7 = 2637.02, G7 = 3135.96, A7 = 3520;

const arpeggio = (notes: readonly number[], step: number, dur: number, wave: Wave, gain: number): OscTone[] =>
  notes.map((freq, i) => ({ freq, at: i * step, dur, wave, gain }));

const shift = (tones: readonly Tone[], ms: number): Tone[] => tones.map(t => ({ ...t, at: t.at + ms }));

// Variantes (révision du 2026-11-13) : un bruitage joué autrement sans changer de nom ; la
// variante n'entre pas dans le journal. Fissure : son rang (0 à 2), de plus en plus forte.
export interface CrackVariant {
  readonly kind: 'crack';
  readonly index: number;
}
// Palier : transposé de `semitones` demi-tons (le vrai palier d'une montée, FR-019).
export interface TierVariant {
  readonly kind: 'tier';
  readonly semitones: number;
}
export type SoundVariant = CrackVariant | TierVariant;

// Creux de la sirène à chaque fissure (FR-017) : −4 dB, le temps que le verre claque. Descente,
// tenue et reprise en ms.
export const SOUND_DIP = { gain: 0.63, down: 8, hold: 70, up: 40 } as const;

// Suspense (FR-017) : la nuit qui tombe, puis une sirène qui grossit, et le cœur qui bat à
// chaque pulsation du halo. Tout se tait au temps figé (`end`).
const SUSPENSE_END = REVEAL_TIMING.suspense - REVEAL_TIMING.freeze;
// Battement : un coup sourd qui tombe (150 → 60 Hz) et un « toc » à 1,2 kHz, le seul qu'un
// haut-parleur de téléphone restitue (il coupe sous 250 Hz). Assez court pour que le dernier,
// 58 ms avant le temps figé, s'éteigne avec lui.
function heartbeat(at: number, gain: number): Tone[] {
  return [
    { wave: 'sine', freq: 150, to: 60, at, dur: 50, gain, decay: 40, release: 8 },
    { wave: 'triangle', freq: 1200, at, dur: 8, gain: gain * 0.4, decay: 6, release: 8 },
  ];
}
// Le cœur bat de plus en plus fort (0,35 au premier, 0,6 au dernier).
const HEART_GAIN = [0.35, 0.6] as const;
function suspenseRecipe(): Tone[] {
  const beats = beatTimes();
  const dips = crackTimes();
  return [
    // La nuit tombe (fondu de 300 ms) : un souffle qui s'assombrit.
    { wave: 'noise', at: 0, dur: 320, gain: 0.25, decay: 200, filter: { type: 'lowpass', freq: 3000, to: 300 } },
    ...beats.flatMap((at, i) => heartbeat(at, HEART_GAIN[0] + ((HEART_GAIN[1] - HEART_GAIN[0]) * i) / (beats.length - 1))),
    // Couche mordante à l'octave, qui s'ouvre en montant : sur un téléphone, la sirène à 220 Hz
    // seule ne s'entend presque pas les premières 400 ms.
    {
      wave: 'sawtooth', freq: 440, to: 1320, at: 0, dur: SUSPENSE_END, gain: 0.05, gainTo: 0.15, release: 20, dips,
      filter: { type: 'lowpass', freq: 1200, to: 4000 },
    },
    // La sirène, en crescendo (+6 dB) ; relâche courte : 130 ms de vrai silence au temps figé.
    // Dernière voix : les tests lisent sa durée.
    { wave: 'triangle', freq: 220, to: 660, at: 0, dur: SUSPENSE_END, gain: 0.3, gainTo: 0.6, release: 20, dips },
  ];
}

// Fissure (FR-017) : un claquement de verre au-dessus de la sirène, transitoire de bruit,
// tintements aigus et « toc » grave ; de plus en plus fort d'une fissure à l'autre.
export const CRACK_GAINS = [0.7, 0.85, 1] as const;
function crackRecipe(index: number): Tone[] {
  const k = CRACK_GAINS[Math.min(index, CRACK_GAINS.length - 1)]!;
  return [
    { wave: 'noise', at: 0, dur: 15, gain: 0.9 * k, decay: 20, release: 15, filter: { type: 'highpass', freq: 3000 } },
    ...[4200, 5100, 6300].map((freq, i): Tone => ({ wave: 'sine', freq, at: 6 * i, dur: 20, gain: 0.22 * k, decay: 50, release: 40 })),
    { wave: 'triangle', freq: 180, to: 120, at: 0, dur: 30, gain: 0.6 * k, decay: 30, release: 20 },
    // L'ancien craquement qui tombe vers le grave, en dessous : le corps de la fissure.
    { wave: 'sawtooth', freq: 2600, to: 500, at: 0, dur: 70, gain: 0.22 * k, decay: 70 },
  ];
}

// Impact (FR-018) : le coup que l'image donne en éclatant (éclair, coup de poing, secousse),
// mis à l'échelle par le rang k de 0 à 4. Un transitoire et du verre dans l'aigu, un corps grave
// doublé à l'octave (pour le téléphone), et dès Légendaire un grondement qui s'amortit avec la
// secousse (même durée). Le pic tombe dans les 20 premières ms, avec l'éclair.
export function impact(k: number): Tone[] {
  const tones: Tone[] = [
    { wave: 'noise', at: 0, dur: 20, gain: 0.4 + 0.1 * k, decay: 15, release: 20, filter: { type: 'highpass', freq: 2000 } },
    { wave: 'noise', at: 0, dur: 150 + 60 * k, gain: 0.15 + 0.04 * k, decay: 80, filter: { type: 'bandpass', freq: 5000, q: 2 } },
    { wave: 'sine', freq: 140, to: 48, at: 0, dur: 160 + 40 * k, gain: 0.4 + 0.1 * k, decay: 60 },
    { wave: 'triangle', freq: 280, to: 96, at: 0, dur: 160 + 40 * k, gain: 0.4 + 0.1 * k, decay: 60 },
  ];
  if (k >= 3) {
    tones.push({ wave: 'noise', at: 0, dur: REVEAL_MOTION.shake, gain: 0.3 + 0.1 * (k - 3), decay: REVEAL_MOTION.shake, filter: { type: 'lowpass', freq: 180 } });
  }
  return tones;
}

// Arpège d'un palier : chaque note frappe puis décroît vers `PLUCK_SUSTAIN` (au lieu du plateau
// d'un orgue).
const PLUCK_SUSTAIN = 0.45;
const plucked = (tones: readonly OscTone[]): OscTone[] => tones.map(t => ({ ...t, decay: t.dur * 0.8, sustain: PLUCK_SUSTAIN }));

// Paillettes (B6) : tintements aigus sur la pentatonique de do, pendant la pluie d'étoiles des
// paliers Légendaire et Ultra, de +400 ms à 200 ms avant la fin. Instants, hauteurs et gains
// tirés UNE fois, au chargement, à graine fixe : ce sont des données. Jamais Math.random, que
// l'e2e remplace par une file (le tirage serait décalé).
const GLITTER_NOTES = [C7, D7, E7, G7, A7];
export const GLITTER = { from: 400, beforeEnd: 200, perSecond: { legendary: 10, ultra: 16 } } as const;
function glitter(seed: number, rarity: keyof typeof GLITTER.perSecond): OscTone[] {
  const rng = mulberry32(seed);
  const span = REVEAL_TIMING.final[rarity] - GLITTER.beforeEnd - GLITTER.from;
  const count = Math.round((GLITTER.perSecond[rarity] * span) / 1000);
  // Chaque tintement dans sa case (span / count) : réguliers sans être mécaniques. Le dernier
  // finit, relâche comprise, au bord de la pluie.
  const slot = (span - 65) / count;
  return Array.from({ length: count }, (_, i) => ({
    wave: 'sine' as const, freq: GLITTER_NOTES[Math.floor(rng() * GLITTER_NOTES.length)]!,
    at: GLITTER.from + Math.round(slot * (i + rng())), dur: 25, gain: 0.05 + 0.04 * rng(), decay: 60, release: 40,
  }));
}

// Transposition d'un bruitage (le bruit n'a pas de hauteur : il reste tel quel).
const transpose = (tones: readonly Tone[], semitones: number): Tone[] => {
  const r = 2 ** (semitones / 12);
  return tones.map(t => (t.wave === 'noise' ? t : { ...t, freq: t.freq * r, ...(t.to !== undefined ? { to: t.to * r } : {}) }));
};

// Recette d'un bruitage dans sa variante, ou dans sa forme par défaut sans variante.
export function soundRecipe(cue: SynthCue, v?: SoundVariant): readonly Tone[] {
  if (v?.kind === 'crack' && cue === 'crack') return crackRecipe(v.index);
  if (v?.kind === 'tier' && cue.startsWith('tier:')) return transpose(SOUND_RECIPES[cue], v.semitones);
  return SOUND_RECIPES[cue];
}

export const SOUND_RECIPES: Readonly<Record<SynthCue, readonly Tone[]>> = {
  // Suspense (004, révision 2 : FR-016 ; révision du 2026-11-13 : FR-017).
  suspense: suspenseRecipe(),
  // Fissure de l'orbe, à pleine force (les fissures du suspense ont leur rang en variante).
  crack: crackRecipe(CRACK_GAINS.length - 1),
  // Paliers (FR-001, FR-018) : l'impact à l'éclat, puis un arpège plus long et plus aigu avec
  // le rang. Le Commun (60 % des tirages) récompense aussi : un pincement rond au-dessus d'un
  // carré adouci, au-dessus du niveau du suspense.
  'tier:common': [
    ...impact(0),
    { wave: 'triangle', freq: C6, at: 0, dur: 180, gain: 0.35, decay: 120 },
    { wave: 'square', freq: C5, at: 0, dur: 180, gain: 0.2, decay: 150, sustain: PLUCK_SUSTAIN, filter: { type: 'lowpass', freq: 2500 } },
  ],
  'tier:uncommon': [...impact(1), ...plucked(arpeggio([C5, E5], 90, 200, 'square', 0.3))],
  'tier:rare': [...impact(2), ...plucked(arpeggio([C5, E5, G5], 90, 260, 'square', 0.35))],
  'tier:legendary': [
    ...impact(3),
    ...plucked(arpeggio([C5, E5, G5, C6], 90, 260, 'square', 0.35)),
    ...[C5, E5, G5].map((freq): Tone => ({ freq, at: 360, dur: 700, wave: 'triangle', gain: 0.3 })),
    ...glitter(0x9117, 'legendary'),
  ],
  'tier:ultra': [
    ...impact(4),
    ...plucked(arpeggio([C5, E5, G5, C6, E6, G6], 80, 260, 'square', 0.35)),
    ...[C6, E6, G6].map((freq): Tone => ({ freq, at: 480, dur: 900, wave: 'triangle', gain: 0.3 })),
    ...shift(arpeggio([C7, G6, C7, G6], 120, 90, 'sine', 0.25), 600),
    ...glitter(0x9118, 'ultra'),
  ],
  // Montée (FR-002, FR-019) : un glissement qui aspire, en crescendo, avec un souffle qui
  // s'ouvre vers l'aigu ; il finit pile sur l'éclat suivant (transition de 300 ms, moins la
  // relâche).
  rise: [
    { freq: 300, to: 1200, at: 0, dur: 290, wave: 'square', gain: 0.2, gainTo: 0.45, release: 10 },
    { wave: 'noise', at: 0, dur: 290, gain: 0.05, gainTo: 0.3, release: 10, filter: { type: 'highpass', freq: 800, to: 8000 } },
  ],
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
  coins: [0, 1, 2].flatMap(i => arpeggio([B5, E6], 80, 60, 'square', 0.06).map(t => ({ ...t, at: t.at + i * 180 }))),
  // Éclats : un carillon cristallin qui monte, en tintements brefs. Trois sinus vers 2 kHz, la
  // zone où l'oreille est la plus sensible : à 0,14 et 220 ms, il passait devant les cartes et
  // le Commun en niveau perçu (critique du 2026-11-13).
  shards: arpeggio([G6, C7, E7], 110, 120, 'sine', 0.06).map(t => ({ ...t, decay: 90 })),
};

// Bornes de la spec, vérifiées par les tests : appui et glissement brefs, tintements pas plus
// longs que le défilement de leur montant (007, FR-015).
export const UI_SOUND_LIMITS = { tap: 100, swish: 100, coins: TRANSITIONS.roll, shards: TRANSITIONS.roll } as const;

// Volume général des bruitages, et enveloppe qui évite les clics en début et fin de note.
// Plus bas qu'avant le limiteur (0,25) alors que les paliers gagnent ~3 LU : le compresseur de
// Web Audio ajoute de lui-même un gain de compensation (~+5 dB avec ces réglages), mesuré au
// rendu hors navigateur.
export const SOUND_MASTER_GAIN = 0.22;
export const SOUND_ATTACK_MS = 5;
export const SOUND_RELEASE_MS = 60;

// Bus maître (révision du 2026-11-13, FR-015) : tout passe par un limiteur avant la sortie,
// pour monter les paliers sans qu'un leurre (rire, faux palier et vrai palier superposés)
// sature. Seuil et genou en dB, attaque et relâche en ms.
export const SOUND_LIMITER = { threshold: -12, knee: 6, ratio: 6, attack: 2, release: 150 } as const;

// Coupure (FR-016) : passer ou couper le son éteint tout en fondu, sans claquement. 20 ms, plus
// les ~6 ms d'anticipation du limiteur de Chromium : sous les 30 ms de la spec.
export const SOUND_STOP_FADE_MS = 20;

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
