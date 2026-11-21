import { mulberry32 } from '../logic/rng';
import { beatTimes, crackTimes } from '../logic/soundCues';
import { RARITIES, type Rarity } from './gachaConfig';
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
  // Crête de la note (avant le volume général), atteinte en `attack` ms (SOUND_ATTACK_MS
  // sinon) : une attaque lente fait « s'ouvrir » un accord au lieu de le frapper.
  readonly gain: number;
  readonly attack?: number;
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
  // Panoramique, de −1 (gauche) à 1 (droite) : le son vient de là où est l'image.
  readonly pan?: number;
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
// `splash` : fanfare de la présentation plein écran (révision du 2026-11-13, FR-021).
export type SynthCue = 'suspense' | 'crack' | `tier:${Rarity}` | 'rise' | 'card' | 'star' | 'splash' | UiCue;

// Notes de do majeur (Hz).
const C5 = 523.25, E5 = 659.25, G5 = 783.99, A5 = 880, B5 = 987.77, C6 = 1046.5, D6 = 1174.66, E6 = 1318.51,
  G6 = 1567.98, A6 = 1760, C7 = 2093, D7 = 2349.32, E7 = 2637.02, G7 = 3135.96, A7 = 3520, C8 = 4186.01;

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

// Creux de la sirène à chaque fissure (FR-017) : −4 dB, le temps que le verre claque. Descente,
// tenue et reprise en ms.
export const SOUND_DIP = { gain: 0.5, down: 8, hold: 80, up: 40 } as const;

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
      wave: 'sawtooth', freq: 440, to: 1320, at: 0, dur: SUSPENSE_END, gain: 0.04, gainTo: 0.12, release: 20, dips,
      filter: { type: 'lowpass', freq: 1200, to: 4000 },
    },
    // La sirène, en crescendo (+6 dB) ; relâche courte : 130 ms de vrai silence au temps figé.
    // Dernière voix : les tests lisent sa durée.
    { wave: 'triangle', freq: 220, to: 660, at: 0, dur: SUSPENSE_END, gain: 0.25, gainTo: 0.5, release: 20, dips },
  ];
}

// Fissure (FR-017) : un claquement de verre au-dessus de la sirène, transitoire de bruit,
// tintements aigus et « toc » grave ; de plus en plus fort d'une fissure à l'autre.
export const CRACK_GAINS = [0.7, 0.85, 1] as const;
function crackRecipe(index: number): Tone[] {
  // ×1,15 : à pleine force, la dernière fissure doit dominer la sirène, au plus fort de son crescendo.
  const k = 1.15 * CRACK_GAINS[Math.min(index, CRACK_GAINS.length - 1)]!;
  return [
    { wave: 'noise', at: 0, dur: 25, gain: 1 * k, decay: 25, release: 15, filter: { type: 'highpass', freq: 3000 } },
    { wave: 'noise', at: 0, dur: 140, gain: 0.35 * k, decay: 110, filter: { type: 'bandpass', freq: 5000, q: 2 } },
    ...[4200, 5100, 6300].map((freq, i): Tone => ({ wave: 'sine', freq, at: 8 * i, dur: 30, gain: 0.3 * k, decay: 90, release: 40 })),
    { wave: 'triangle', freq: 180, to: 120, at: 0, dur: 40, gain: 0.6 * k, decay: 40, release: 20 },
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
    { wave: 'noise', at: 0, dur: 20, gain: 0.35 + 0.08 * k, decay: 15, release: 20, filter: { type: 'highpass', freq: 2000 } },
    { wave: 'noise', at: 0, dur: 150 + 60 * k, gain: 0.15 + 0.04 * k, decay: 80, filter: { type: 'bandpass', freq: 5000, q: 2 } },
    { wave: 'sine', freq: 140, to: 48, at: 0, dur: 160 + 40 * k, gain: 0.25 + 0.06 * k, decay: 60 },
    { wave: 'triangle', freq: 280, to: 96, at: 0, dur: 160 + 40 * k, gain: 0.25 + 0.06 * k, decay: 60 },
  ];
  if (k >= 3) {
    tones.push({ wave: 'noise', at: 0, dur: REVEAL_MOTION.shake, gain: 0.3 + 0.1 * (k - 3), decay: REVEAL_MOTION.shake, filter: { type: 'lowpass', freq: 180 } });
  }
  return tones;
}

// Passage vers les cartes (FR-023) : un souffle bref qui retombe sous le voile de lumière qui
// clôt la révélation (REVEAL_MOTION.outro, src/ui/reveal.ts), et finit avec elle. Le bruit n'a
// pas de hauteur : la transposition d'une montée le laisse tel quel.
const OUTRO_RELEASE = 20;
export function outroBreath(rarity: Rarity): Tone[] {
  return [{
    wave: 'noise', at: REVEAL_TIMING.final[rarity] - REVEAL_MOTION.outro, dur: REVEAL_MOTION.outro - OUTRO_RELEASE,
    gain: 0.1, gainTo: 0.03, release: OUTRO_RELEASE, filter: { type: 'lowpass', freq: 2000, to: 400 },
  }];
}

const rankOf = (rarity: Rarity): number => RARITIES.find(r => r.id === rarity)!.rank;
const panned = (tones: readonly Tone[], pan: number): Tone[] => (pan === 0 ? [...tones] : tones.map(t => ({ ...t, pan })));

// Variantes (révision du 2026-11-13) : un bruitage joué avec les instants et le rang de ce
// qu'il accompagne. `kind` est le nom du bruitage ; la variante n'entre pas dans le journal.
// Carte du ×10 (FR-020) : `step` = rang de la carte dans l'ordre de retournement.
export interface CardVariant {
  readonly kind: 'card';
  readonly anticipation: number;
  readonly turn: number;
  readonly rarity: Rarity;
  readonly step: number;
  readonly pan: number;
}
// Vedette : `beat` = durée du battement de cœur, avant le retournement de `turn` ms.
export interface StarVariant {
  readonly kind: 'star';
  readonly beat: number;
  readonly turn: number;
  readonly rarity: Rarity;
}
// Présentation (FR-021) : instants de l'éclair et du nom qui se pose, depuis l'ouverture.
export interface SplashVariant {
  readonly kind: 'splash';
  readonly rarity: Rarity;
  readonly flash: number;
  readonly stamp: number;
}
// Pièces (FR-022) : le motif descend quand le solde baisse, monte quand il monte.
export interface CoinsVariant {
  readonly kind: 'coins';
  readonly dir: 'down' | 'up';
}
// Éclats qui suivent les pièces : décalés pour ne pas tinter en même temps (FR-022).
export interface ShardsVariant {
  readonly kind: 'shards';
  readonly delay: number;
}
export type SoundVariant = CrackVariant | TierVariant | CardVariant | StarVariant | SplashVariant | CoinsVariant | ShardsVariant;

// Battement de cœur de la vedette : un coup sourd qui tombe (150 → 60 Hz) et un « toc » à 1,2 kHz, le seul
// qu'un téléphone restitue ; un second coup plus doux suit (« poum-poum ») quand le battement
// laisse la place de l'entendre.
const HEART_DUB = { after: 110, gain: 0.6, minBeat: 150 } as const;
function starHeartbeat(at: number, gain: number, beat: number): Tone[] {
  const thump = (t: number, g: number): Tone[] => [
    { wave: 'sine', freq: 150, to: 60, at: t, dur: 90, gain: g, decay: 40 },
    { wave: 'triangle', freq: 1200, at: t, dur: 8, gain: g * 0.4, decay: 6, release: 10 },
  ];
  return [...thump(at, gain), ...(beat >= HEART_DUB.minBeat ? thump(at + HEART_DUB.after, gain * HEART_DUB.gain) : [])];
}

// Paillettes : tintements aigus sur la pentatonique de do, qui accompagnent une pluie
// d'étoiles. Instants, hauteurs et gains tirés UNE fois, au chargement, à graine fixe : ce sont
// des données. Jamais Math.random, que l'e2e remplace par une file (le tirage serait décalé).
const GLITTER_NOTES = [C7, D7, E7, G7, A7];
function rainGlitter(seed: number, perSecond: number, span: number): OscTone[] {
  const rng = mulberry32(seed);
  const count = Math.round((perSecond * span) / 1000);
  return Array.from({ length: count }, (_, i) => ({
    wave: 'sine' as const, freq: GLITTER_NOTES[Math.floor(rng() * GLITTER_NOTES.length)]!,
    at: Math.round((span * (i + rng())) / count), dur: 25, gain: 0.05 + 0.04 * rng(), decay: 60, release: 40,
  }));
}
// Durée de la pluie d'étoiles de la vedette (src/ui/reveal.ts, `rain`).
export const STAR_RAIN_MS = 1200;
const STAR_GLITTER: Partial<Record<Rarity, readonly OscTone[]>> = {
  legendary: rainGlitter(0x9117, 10, STAR_RAIN_MS),
  ultra: rainGlitter(0x9118, 16, STAR_RAIN_MS),
};

// Cartes du ×10 (FR-020) : une échelle montante, une note plus haut à chaque carte retournée,
// jusqu'à la vedette. Pentatonique : aucune paire de notes voisines ne grince.
export const CARD_LADDER: readonly number[] = [G5, A5, C6, D6, E6, G6, A6, C7, D7];
// Étalement stéréo : le son d'une carte vient de sa colonne (±0,36 pour les deux colonnes).
export const PAN_SPREAD = 0.75;

// Instant de la face, depuis le début du son de la carte (début de l'anticipation) : c'est là
// que l'image la montre, à mi-retournement (src/ui/reveal.ts, `turn`).
export const cardFaceAt = (v: { anticipation: number; turn: number }): number => v.anticipation + v.turn / 2;

// Son d'une carte : dès Rare, une charge qui monte pendant que le dos tremble ; un froissement
// qui enfle pendant que la carte tourne sur la tranche ; à la face, un pincement sur l'échelle,
// enrichi de la quinte (Peu commun), de la tierce et d'un éclat de verre (Rare, avec l'onde),
// puis de cloches (Légendaire, Ultra rare).
export function cardRecipe(v: CardVariant): Tone[] {
  const k = rankOf(v.rarity);
  const face = cardFaceAt(v);
  const note = CARD_LADDER[Math.min(v.step, CARD_LADDER.length - 1)]!;
  const tones: Tone[] = [
    { wave: 'noise', at: v.anticipation, dur: v.turn / 2, gain: 0.03, gainTo: 0.1, release: 15, filter: { type: 'bandpass', freq: 2500, to: 5000, q: 1.5 } },
    { wave: 'noise', at: face, dur: 12, gain: 0.12, decay: 10, release: 10, filter: { type: 'highpass', freq: 3000 } },
    { wave: 'triangle', freq: note, at: face, dur: 160, gain: 0.5, decay: 140, sustain: 0.1 },
    { wave: 'sine', freq: note * 2, at: face, dur: 200, gain: 0.12, decay: 180 },
  ];
  if (k >= 2 && v.anticipation > 0) {
    tones.unshift({ wave: 'sine', freq: 500, to: 1000, at: 0, dur: v.anticipation, gain: 0, gainTo: 0.1 + 0.03 * k, release: 20 });
  }
  if (k >= 1) tones.push({ wave: 'triangle', freq: note * 1.5, at: face + 25, dur: 160, gain: 0.3, decay: 140 });
  if (k >= 2) {
    tones.push({ wave: 'triangle', freq: note * 1.26, at: face + 50, dur: 160, gain: 0.3, decay: 140 });
    tones.push({ wave: 'noise', at: face, dur: 120, gain: 0.12, decay: 80, filter: { type: 'bandpass', freq: 5000, q: 2 } });
  }
  if (k >= 3) tones.push({ wave: 'sine', freq: note * 4, at: face + 75, dur: 300, gain: 0.08, decay: 260 });
  if (k >= 4) tones.push({ wave: 'sine', freq: note * 3, at: face + 100, dur: 300, gain: 0.08, decay: 260 });
  return panned(tones, v.pan);
}

// Arpège de la vedette, à sa face : des notes de plus que la carte ordinaire, plus haut le rang.
const STAR_NOTES = [G5, C6, E6, G6, C7, E7];

// Vedette (FR-020) : son dos bat comme un cœur pendant que les autres s'assombrissent, une
// tension monte sous les battements, puis la face frappe (impact du rang), l'arpège du palier
// sonne, et dès Légendaire les paillettes accompagnent la pluie d'étoiles.
export function starRecipe(v: StarVariant): Tone[] {
  const k = rankOf(v.rarity);
  const beats = k >= 3 ? 3 : 2;
  const face = v.beat + v.turn / 2;
  const tones: Tone[] = [
    // Les autres cartes s'assombrissent (250 ms) : un souffle qui retombe.
    { wave: 'noise', at: 0, dur: 250, gain: 0.08, gainTo: 0, release: 20, filter: { type: 'lowpass', freq: 1500, to: 300 } },
    { wave: 'sine', freq: 220, to: 330, at: 0, dur: face, gain: 0.1, gainTo: 0.3, release: 20 },
    // Battements de 0,30 à 0,45 : sous l'impact de la face (0,51 dès Rare), qui reste le sommet.
    ...Array.from({ length: beats }, (_, b) => starHeartbeat((b * v.beat) / beats, 0.3 + (0.15 * b) / Math.max(1, beats - 1), v.beat / beats)).flat(),
    ...shift(impact(k), face),
    ...STAR_NOTES.slice(0, 2 + k).map((freq, i): Tone => ({
      wave: 'triangle', freq, at: face + i * 70, dur: 260, gain: 0.45, decay: 240, sustain: 0.3,
    })),
  ];
  if (k >= 3) {
    const chord = face + (1 + k) * 70;
    tones.push(...[C6, E6, G6].map((freq): Tone => ({ wave: 'triangle', freq, at: chord, dur: 600, gain: 0.18, attack: 30, decay: 500, sustain: 0.3 })));
    tones.push(...shift(STAR_GLITTER[v.rarity]!, face));
  }
  return tones;
}

// Arpège d'un palier : chaque note frappe puis décroît vers `PLUCK_SUSTAIN` (au lieu du plateau
// d'un orgue).
const PLUCK_SUSTAIN = 0.6;
const plucked = (tones: readonly OscTone[]): OscTone[] => tones.map(t => ({ ...t, decay: t.dur * 0.8, sustain: PLUCK_SUSTAIN }));

// Paillettes (B6) : tintements aigus sur la pentatonique de do, pendant la pluie d'étoiles des
// paliers Légendaire et Ultra, de +400 ms à 200 ms avant la fin. Instants, hauteurs et gains
// tirés UNE fois, au chargement, à graine fixe : ce sont des données. Jamais Math.random, que
// l'e2e remplace par une file (le tirage serait décalé).
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

// Fanfare de la présentation (FR-021) : la silhouette aspire (souffle qui monte), l'éclair
// frappe (impact) et ouvre un accord de do majeur 9 en chœur (paires de triangles désaccordés),
// le nom se pose sur un « ta-da » G6 → C7 ; l'Ultra rare y ajoute des cloches. 1,6 s au plus.
export const SPLASH_MAX_MS = 1600;
export function splashRecipe(v: SplashVariant): Tone[] {
  const k = rankOf(v.rarity);
  const tones: Tone[] = [];
  if (v.flash > 0) {
    tones.push({ wave: 'noise', at: 0, dur: v.flash, gain: 0.02, gainTo: 0.2, release: 10, filter: { type: 'bandpass', freq: 400, to: 3000, q: 1 } });
    tones.push({ wave: 'sine', freq: 220, to: 440, at: 0, dur: v.flash, gain: 0, gainTo: 0.15, release: 10 });
  }
  tones.push(...shift(impact(k), v.flash));
  for (const freq of [C5, E5, G5, B5, D6]) {
    for (const detune of [-6, 6]) {
      tones.push({ wave: 'triangle', freq, detune, at: v.flash, dur: 1150, gain: 0.12, attack: 60, decay: 1200, sustain: 0.5, release: 400 });
    }
  }
  tones.push(
    { wave: 'triangle', freq: G6, at: v.stamp, dur: 120, gain: 0.35, decay: 100 },
    { wave: 'triangle', freq: C7, at: v.stamp + 90, dur: 260, gain: 0.35, decay: 220, sustain: 0.2 },
  );
  if (k >= 4) {
    tones.push(...[C7, E7, G7, C8].map((freq, i): Tone => ({ wave: 'sine', freq, at: v.stamp + 180 + i * 90, dur: 400, gain: 0.15, decay: 350 })));
  }
  return tones;
}

// Pièces : le « si-mi » des pièces de jeu vidéo (gain), ou le même motif à l'envers (dépense).
function coinsRecipe(dir: CoinsVariant['dir']): Tone[] {
  if (dir === 'up') return [0, 1, 2].flatMap(i => arpeggio([B5, E6], 80, 60, 'square', 0.06).map(t => ({ ...t, at: t.at + i * 180 })));
  return [0, 1].flatMap(i => arpeggio([E6, B5], 70, 50, 'square', 0.07).map(t => ({ ...t, at: t.at + i * 200, decay: 40, sustain: 0.2 })));
}
// Éclats : un carillon cristallin qui monte, en tintements brefs. Trois sinus vers 2 kHz, la
// zone où l'oreille est la plus sensible : à 0,14 et 220 ms, il passait devant les cartes et
// le Commun en niveau perçu (critique du 2026-11-13).
const SHARDS: readonly Tone[] = arpeggio([G6, C7, E7], 110, 120, 'sine', 0.06).map(t => ({ ...t, decay: 90 }));
// Décalage des éclats quand les pièces tintent aussi (FR-022).
export const SHARDS_AFTER_COINS = 120;

// Recette d'un bruitage dans sa variante, ou dans sa forme par défaut sans variante.
export function soundRecipe(cue: SynthCue, v?: SoundVariant): readonly Tone[] {
  if (v === undefined) return SOUND_RECIPES[cue];
  if (v.kind === 'tier') return cue.startsWith('tier:') ? transpose(SOUND_RECIPES[cue], v.semitones) : SOUND_RECIPES[cue];
  if (v.kind !== cue) return SOUND_RECIPES[cue];
  switch (v.kind) {
    case 'crack': return crackRecipe(v.index);
    case 'card': return cardRecipe(v);
    case 'star': return starRecipe(v);
    case 'splash': return splashRecipe(v);
    case 'coins': return coinsRecipe(v.dir);
    case 'shards': return shift(SHARDS, v.delay);
  }
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
    ...impact(0), ...outroBreath('common'),
    { wave: 'triangle', freq: C6, at: 0, dur: 380, gain: 0.85, decay: 300, sustain: 0.45 },
    { wave: 'sine', freq: C7, at: 0, dur: 240, gain: 0.15, decay: 200 },
    { wave: 'square', freq: C5, at: 0, dur: 380, gain: 0.3, decay: 300, sustain: PLUCK_SUSTAIN, filter: { type: 'lowpass', freq: 2500 } },
  ],
  'tier:uncommon': [...impact(1), ...outroBreath('uncommon'), ...plucked(arpeggio([C5, E5], 90, 380, 'square', 0.45))],
  'tier:rare': [...impact(2), ...outroBreath('rare'), ...plucked(arpeggio([C5, E5, G5], 90, 420, 'square', 0.42))],
  'tier:legendary': [
    ...impact(3), ...outroBreath('legendary'),
    ...plucked(arpeggio([C5, E5, G5, C6], 90, 420, 'square', 0.42)),
    ...[C5, E5, G5].map((freq): Tone => ({ freq, at: 360, dur: 700, wave: 'triangle', gain: 0.3 })),
    ...glitter(0x9117, 'legendary'),
  ],
  'tier:ultra': [
    ...impact(4), ...outroBreath('ultra'),
    ...plucked(arpeggio([C5, E5, G5, C6, E6, G6], 80, 420, 'square', 0.42)),
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
  // Cartes du ×10 (FR-004, FR-020) : formes par défaut, sans variante (carte commune, la
  // première de l'échelle ; vedette Rare ; présentation d'un Légendaire).
  card: cardRecipe({ kind: 'card', anticipation: 0, turn: 200, rarity: 'common', step: 0, pan: 0 }),
  star: starRecipe({ kind: 'star', beat: 360, turn: 360, rarity: 'rare' }),
  splash: splashRecipe({ kind: 'splash', rarity: 'legendary', flash: 250, stamp: 450 }),
  // Interface : gains bien sous ceux des paliers (0,25 à 0,5), pour rester en arrière-plan.
  // Appui : un « pop » montant, très court (FR-011 : 0,1 s au plus).
  // Fin audible, relâche comprise : 45 + 40 ms.
  tap: [{ freq: 520, to: 820, at: 0, dur: 45, wave: 'triangle', gain: 0.18, decay: 35, sustain: 0.4, release: 40 }],
  // Bannière : un souffle qui balaie vers l'aigu (FR-022), fermé par un petit tic quand le
  // bandeau se pose. Fin audible : 80 + 15 et 84 + 12 ms.
  swish: [
    { wave: 'noise', at: 0, dur: 80, gain: 0.05, gainTo: 0.14, release: 15, filter: { type: 'bandpass', freq: 800, to: 3000, q: 1.2 } },
    { wave: 'triangle', freq: 1500, at: 80, dur: 4, gain: 0.08, decay: 4, release: 12 },
  ],
  // Pièces, sans variante : le motif du gain.
  coins: coinsRecipe('up'),
  shards: SHARDS,
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
// palier (`of` : `tier:*`) s'effacent en `ms` ; `pitch` < 1 les fait aussi descendre, comme une
// bande qui ralentit (le leurre se dégonfle). Pendant le rire, le vrai palier fait baisser le
// rire (`laughDuck`) pour qu'on l'entende sous la moquerie. La fanfare d'une présentation
// éteint la vedette du ×10 qui sonne encore (ses paillettes, sous la nuit qui tombe).
export const SOUND_CHOKES = {
  rise: { of: 'tier:', ms: 60, pitch: 1 },
  laugh: { of: 'tier:', ms: 300, pitch: 0.5 },
  splash: { of: 'star', ms: 150, pitch: 1 },
} as const satisfies Partial<Record<SynthCue | 'laugh', { of: string; ms: number; pitch: number }>>;
// Fondu de la fanfare quand le joueur ferme la présentation (FR-021).
export const SPLASH_FADE_MS = 150;
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
  const attack = (t.attack ?? SOUND_ATTACK_MS) / 1000, dur = t.dur / 1000, release = (t.release ?? SOUND_RELEASE_MS) / 1000;
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
