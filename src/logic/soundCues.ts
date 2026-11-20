import type { Rarity } from '../data/gachaConfig';
import { REVEAL_TIMING } from '../data/revealConfig';
import type { SoundVariant, UiCue } from '../data/sounds';
import type { FlipSchedule, RevealPlan } from './reveal';

export type Cue = 'suspense' | 'crack' | `tier:${Rarity}` | 'rise' | 'laugh' | 'card' | 'star' | 'splash' | UiCue;

export interface SoundCue {
  // Instant en ms depuis le début de la révélation, ou du retournement des cartes.
  readonly at: number;
  readonly cue: Cue;
  // Ce qui change le son sans changer son nom (rang d'une fissure, palier transposé, instants et
  // rang de ce que le son accompagne) ; hors du journal (révision du 2026-11-13).
  readonly variant?: SoundVariant;
}

// Instants (ms) des fissures et des battements du cœur pendant le suspense, partagés par
// l'image (src/ui/reveal.ts) et le son (src/data/sounds.ts).
const ofSuspense = (fractions: readonly number[]) => fractions.map(f => Math.round(REVEAL_TIMING.suspense * f));
export const crackTimes = () => ofSuspense(REVEAL_TIMING.cracks);
export const beatTimes = () => ofSuspense(REVEAL_TIMING.beats);

// Montée (FR-019) : le vrai palier sonne un ton plus haut que le faux, le « encore mieux ».
export const RISE_SEMITONES = 2;

// Calendrier des sons d'une révélation, calé sur les instants de l'animation (004) :
// un craquement à chaque fissure de l'orbe (révision 2, FR-016), de plus en plus fort, un son
// par palier montré à son éclat, et à la transition le son de montée ou le rire du leurre.
export function revealCues(plan: RevealPlan): SoundCue[] {
  const t = REVEAL_TIMING;
  const cues: SoundCue[] = [
    { at: 0, cue: 'suspense' },
    ...crackTimes().map((at, index): SoundCue => ({ at, cue: 'crack', variant: { kind: 'crack', index } })),
  ];
  let time = t.suspense;
  plan.steps.forEach((rarity, i) => {
    const raised = plan.kind === 'rise' && i > 0;
    cues.push({ at: time, cue: `tier:${rarity}`, ...(raised ? { variant: { kind: 'tier', semitones: RISE_SEMITONES } } : {}) });
    if (i < plan.steps.length - 1) {
      cues.push({ at: time + t.fakeStep, cue: plan.kind === 'lure' ? 'laugh' : 'rise' });
      time += t.fakeStep + t.transition;
    }
  });
  return cues;
}

// Retournement du ×10 : un son par carte ordinaire, un son marqué pour la vedette (FR-004).
// Révision du 2026-11-13 (FR-020) : chacun part au début de l'anticipation (le dos qui tremble,
// le cœur qui bat) et porte ses instants, pour que sa note tombe à l'apparition de la face,
// une marche plus haut à chaque carte. `panOf` : panoramique de la carte `index` (sa colonne).
export function flipCues(schedule: FlipSchedule, panOf: (index: number) => number = () => 0): SoundCue[] {
  let step = 0;
  return schedule.steps.map((s): SoundCue => s.star
    ? { at: s.at, cue: 'star', variant: { kind: 'star', beat: s.anticipation, turn: s.turn, rarity: s.rarity } }
    : { at: s.at, cue: 'card', variant: {
      kind: 'card', anticipation: s.anticipation, turn: s.turn, rarity: s.rarity, step: step++, pan: panOf(s.index),
    } });
}
