import type { Rarity } from './gachaConfig';
import { TRANSITIONS } from './ambienceConfig';
import { REVEAL_TIMING } from './revealConfig';

// Bruitages synthétisés (005, ADR 0006) : des « recettes » jouées par src/ui/sfx.ts.
// Provisoires comme la DA : changer un son = changer ces données.

export type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth';

export interface Tone {
  // Fréquence de départ et, pour un glissando, d'arrivée (Hz).
  readonly freq: number;
  readonly to?: number;
  // Début et durée, en ms depuis le début du bruitage.
  readonly at: number;
  readonly dur: number;
  readonly wave: Wave;
  readonly gain: number;
}

// Sons d'interface (révision du 2026-11-09, FR-011 à FR-013) : appui, glissement de bannière,
// pièces et éclats qui tintent pendant que leur montant défile.
export type UiCue = 'tap' | 'swish' | 'coins' | 'shards';
export type SynthCue = 'suspense' | 'crack' | `tier:${Rarity}` | 'rise' | 'card' | 'star' | UiCue;

// Notes de do majeur (Hz).
const C5 = 523.25, E5 = 659.25, G5 = 783.99, B5 = 987.77, C6 = 1046.5, E6 = 1318.51, G6 = 1567.98, C7 = 2093, E7 = 2637.02;

const arpeggio = (notes: readonly number[], step: number, dur: number, wave: Wave, gain: number): Tone[] =>
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
  tap: [{ freq: 520, to: 820, at: 0, dur: 45, wave: 'triangle', gain: 0.18 }],
  // Bannière : un glissement rapide vers l'aigu, comme une page qu'on tourne.
  swish: [{ freq: 260, to: 1100, at: 0, dur: 90, wave: 'sine', gain: 0.16 }],
  // Pièces : le « si-mi » des pièces de jeu vidéo, trois fois, le temps du défilement.
  coins: [0, 1, 2].flatMap(i => arpeggio([B5, E6], 80, 60, 'square', 0.08).map(t => ({ ...t, at: t.at + i * 180 }))),
  // Éclats : un carillon cristallin qui monte.
  shards: arpeggio([G6, C7, E7], 110, 220, 'sine', 0.14),
};

// Bornes de la spec, vérifiées par les tests : appui et glissement brefs, tintements pas plus
// longs que le défilement de leur montant (007, FR-015).
export const UI_SOUND_LIMITS = { tap: 100, swish: 100, coins: TRANSITIONS.roll, shards: TRANSITIONS.roll } as const;

// Volume général des bruitages, et enveloppe qui évite les clics en début et fin de note.
export const SOUND_MASTER_GAIN = 0.25;
export const SOUND_ATTACK_MS = 5;
export const SOUND_RELEASE_MS = 60;

// Enregistrements (public/sounds/, CREDITS.md) : le rire du leurre (FR-003, FR-010).
export const LAUGH = { key: 'rire', urls: ['sounds/rire-diabolique.ogg', 'sounds/rire-diabolique.mp3'], gain: 0.8 } as const;
