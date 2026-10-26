import type { Rarity } from '../data/gachaConfig';
import { REVEAL_TIMING } from '../data/revealConfig';
import type { FlipSchedule, RevealPlan } from './reveal';

export type Cue = 'suspense' | `tier:${Rarity}` | 'rise' | 'laugh' | 'card' | 'star';

export interface SoundCue {
  // Instant en ms depuis le début de la révélation, ou du retournement des cartes.
  readonly at: number;
  readonly cue: Cue;
}

// Calendrier des sons d'une révélation, calé sur les instants de l'animation (004) :
// un son par palier montré à son éclat, et à la transition le son de montée ou le rire
// du leurre (FR-001 à FR-003).
export function revealCues(plan: RevealPlan): SoundCue[] {
  const t = REVEAL_TIMING;
  const cues: SoundCue[] = [{ at: 0, cue: 'suspense' }];
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
