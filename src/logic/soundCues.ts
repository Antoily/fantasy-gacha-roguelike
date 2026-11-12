import type { Rarity } from '../data/gachaConfig';
import { REVEAL_TIMING } from '../data/revealConfig';
import type { UiCue } from '../data/sounds';
import type { FlipSchedule, RevealPlan } from './reveal';

export type Cue = 'suspense' | 'crack' | `tier:${Rarity}` | 'rise' | 'laugh' | 'card' | 'star' | UiCue;

export interface SoundCue {
  // Instant en ms depuis le début de la révélation, ou du retournement des cartes.
  readonly at: number;
  readonly cue: Cue;
}

// Calendrier des sons d'une révélation, calé sur les instants de l'animation (004) :
// un craquement à chaque fissure de l'orbe (révision 2, FR-016), un son par palier
// montré à son éclat, et à la transition le son de montée ou le rire du leurre.
export const crackTimes = () => REVEAL_TIMING.cracks.map(f => Math.round(REVEAL_TIMING.suspense * f));

export function revealCues(plan: RevealPlan): SoundCue[] {
  const t = REVEAL_TIMING;
  const cues: SoundCue[] = [{ at: 0, cue: 'suspense' }, ...crackTimes().map(at => ({ at, cue: 'crack' as const }))];
  let time = t.suspense;
  plan.steps.forEach((rarity, i) => {
    cues.push({ at: time, cue: `tier:${rarity}` });
    if (i < plan.steps.length - 1) {
      cues.push({ at: time + t.fakeStep, cue: plan.kind === 'lure' ? 'laugh' : 'rise' });
      time += t.fakeStep + t.transition;
    }
  });
  return cues;
}

// Retournement du ×10 : un petit bruit par carte ordinaire, un son marqué pour la
// vedette, chacun quand la carte commence à tourner (FR-004).
export function flipCues(schedule: FlipSchedule): SoundCue[] {
  return schedule.steps.map(s => ({ at: s.at + s.anticipation, cue: s.star ? 'star' : 'card' }));
}
