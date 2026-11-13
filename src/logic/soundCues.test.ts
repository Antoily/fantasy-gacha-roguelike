import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue';
import { RARITIES, type Rarity } from '../data/gachaConfig';
import { FLIP_TIMING, REVEAL_TIMING as T } from '../data/revealConfig';
import {
  SOUND_RECIPES, UI_SOUND_LIMITS, recipeEnd, recipeEnergy, toneEnergy, type Tone,
} from '../data/sounds';
import type { PullResult } from './gacha';
import { flipOrder, flipSchedule, planReveal, revealDuration, type RevealPlan } from './reveal';
import { DEFAULT_SETTINGS, parseSettings, serializeSettings } from './settings';
import { crackTimes, flipCues, revealCues } from './soundCues';
import { scriptedRng } from './testing';

const res = (rarity: Rarity): PullResult =>
  ({ item: CATALOGUE.find(i => i.rarity === rarity)!, isNew: true, guaranteed: false, pity: false, shards: 0, featuredGuarantee: false });
const plan = (rarity: Rarity, u: number, v = 0.5): RevealPlan => planReveal([res(rarity)], scriptedRng([u, v]));
const names = (p: RevealPlan) => revealCues(p).map(c => c.cue);
const ALL: Rarity[] = RARITIES.map(r => r.id);
// Début de toute révélation : la sirène, puis un craquement à chaque fissure (FR-016).
const OPENING = [{ at: 0, cue: 'suspense' }, ...crackTimes().map(at => ({ at, cue: 'crack' }))];
const OPEN = ['suspense', 'crack', 'crack', 'crack'];

describe('sons de la révélation (FR-001 à FR-003)', () => {
  it('trois craquements pendant le suspense, avant le temps figé (004, FR-016)', () => {
    const cracks = revealCues(plan('common', 0.9)).filter(c => c.cue === 'crack').map(c => c.at);
    expect(cracks).toHaveLength(3);
    expect(cracks.every(at => at > 0 && at < T.suspense - T.freeze)).toBe(true);
    // La sirène se tait au temps figé.
    expect(SOUND_RECIPES.suspense.at(-1)!.dur).toBe(T.suspense - T.freeze);
  });

  it('palier direct : suspense à 0, puis le palier à la fin du suspense', () => {
    for (const r of ALL) {
      expect(revealCues(plan(r, 0.9))).toEqual([...OPENING, { at: T.suspense, cue: `tier:${r}` }]);
    }
  });

  it('montée : faux palier, son de montée à la transition, vrai palier', () => {
    expect(revealCues(plan('legendary', 0))).toEqual([
      ...OPENING,
      { at: T.suspense, cue: 'tier:rare' },
      { at: T.suspense + T.fakeStep, cue: 'rise' },
      { at: T.suspense + T.fakeStep + T.transition, cue: 'tier:legendary' },
    ]);
  });

  it('leurre : le rire quand l’effet se dégonfle, puis Rare', () => {
    expect(revealCues(plan('rare', 0.05, 0.1))).toEqual([
      ...OPENING,
      { at: T.suspense, cue: 'tier:ultra' },
      { at: T.suspense + T.fakeStep, cue: 'laugh' },
      { at: T.suspense + T.fakeStep + T.transition, cue: 'tier:rare' },
    ]);
    expect(names(plan('rare', 0.05, 0.5))).toEqual([...OPEN, 'tier:legendary', 'laugh', 'tier:rare']);
  });

  it('le rire seulement pour un leurre, le son de montée seulement pour une montée (SC-004)', () => {
    for (const r of ALL) {
      for (const u of [0, 0.05, 0.15, 0.3, 0.9]) {
        const p = plan(r, u, 0.1);
        expect(names(p).includes('laugh'), `${r} ${u}`).toBe(p.kind === 'lure');
        expect(names(p).includes('rise'), `${r} ${u}`).toBe(p.kind === 'rise');
        // Le dernier palier entendu est le vrai, et rien ne sonne après la fin de l'animation.
        expect(names(p).filter(c => c.startsWith('tier:')).at(-1)).toBe(`tier:${r}`);
        expect(Math.max(...revealCues(p).map(c => c.at))).toBeLessThan(revealDuration(p));
      }
    }
  });

  it('chaque bruitage synthétisé a une recette non vide', () => {
    for (const [cue, tones] of Object.entries(SOUND_RECIPES)) expect(tones.length, cue).toBeGreaterThan(0);
  });

  // Révision du 2026-11-09 : FR-011 (appui et glissement brefs), FR-012 (tintement pas plus
  // long que le défilement). Révision du 2026-11-13 : fin audible, relâche comprise.
  it('sons d’interface : bornes de durée, relâche comprise', () => {
    for (const [cue, limit] of Object.entries(UI_SOUND_LIMITS) as [keyof typeof UI_SOUND_LIMITS, number][]) {
      expect(recipeEnd(SOUND_RECIPES[cue]), cue).toBeLessThanOrEqual(limit);
    }
    expect(UI_SOUND_LIMITS.tap).toBe(100);
    expect(UI_SOUND_LIMITS.swish).toBe(100);
  });

  // FR-015 : l'interface reste sous le tirage en énergie perçue, pas seulement en gain de
  // crête (trois tintements longs à gain faible passaient devant un tic de carte).
  it('sons d’interface plus discrets que le plus discret des sons du tirage, en énergie', () => {
    const quietestReveal = Math.min(...(['tier:common', 'card', 'star'] as const).map(c => recipeEnergy(SOUND_RECIPES[c])));
    for (const cue of Object.keys(UI_SOUND_LIMITS) as (keyof typeof UI_SOUND_LIMITS)[]) {
      expect(recipeEnergy(SOUND_RECIPES[cue]), cue).toBeLessThan(quietestReveal);
    }
  });

  it('énergie : durée, gain, forme d’onde et décroissance comptent', () => {
    const square: Tone = { wave: 'square', freq: 440, at: 0, dur: 1000, gain: 1, release: 0 };
    // Plateau d'une seconde à amplitude 1 : ~1 (moins la moitié de l'attaque de 5 ms).
    expect(toneEnergy(square)).toBeCloseTo(1, 2);
    expect(toneEnergy({ ...square, gain: 0.5 })).toBeCloseTo(0.25, 2);
    expect(toneEnergy({ ...square, dur: 500 })).toBeCloseTo(0.5, 2);
    expect(toneEnergy({ ...square, wave: 'sine' })).toBeCloseTo(0.5, 2);
    expect(toneEnergy({ wave: 'noise', at: 0, dur: 1000, gain: 1, release: 0 })).toBeCloseTo(1 / 3, 2);
    // Décroissance de 300 ms vers 0 : ∫ e^(-2x/τ) = τ/2 avec τ = 0,1 s.
    expect(toneEnergy({ ...square, decay: 300 })).toBeCloseTo(0.05, 2);
    expect(toneEnergy({ ...square, decay: 300, sustain: 1 })).toBeCloseTo(1, 2);
    // Crescendo linéaire de 0 à 1 : ∫ x² = 1/3.
    expect(toneEnergy({ ...square, gain: 0, gainTo: 1 })).toBeCloseTo(1 / 3, 2);
    // Relâche : g² × relâche / 10.
    expect(toneEnergy({ ...square, release: 1000 }) - toneEnergy(square)).toBeCloseTo(0.1, 2);
    expect(recipeEnergy([square, square])).toBeCloseTo(2 * toneEnergy(square), 6);
  });

  // FR-014 : enveloppes et filtres plausibles dans toutes les recettes.
  it('recettes : décroissance positive, filtres dans l’audible, pas de crescendo décroissant', () => {
    for (const [cue, tones] of Object.entries(SOUND_RECIPES)) {
      for (const t of tones) {
        if (t.decay !== undefined) expect(t.decay, cue).toBeGreaterThan(0);
        expect(t.decay !== undefined && t.gainTo !== undefined, `${cue} : décroissance ou crescendo, pas les deux`).toBe(false);
        if (t.sustain !== undefined) expect(t.sustain >= 0 && t.sustain <= 1, cue).toBe(true);
        if (t.release !== undefined) expect(t.release, cue).toBeGreaterThan(0);
        if (t.filter) expect(Math.max(t.filter.freq, t.filter.to ?? 0), cue).toBeLessThanOrEqual(18000);
      }
    }
  });

  // Les queues des recettes, relâche comprise : la sirène se tait avant l'éclatement, et chaque
  // palier a fini de sonner avant la fin de son animation.
  it('fins audibles : rien ne déborde de l’animation', () => {
    expect(recipeEnd(SOUND_RECIPES.suspense)).toBeLessThan(T.suspense);
    for (const r of ALL) expect(recipeEnd(SOUND_RECIPES[`tier:${r}`]), r).toBeLessThanOrEqual(T.final[r]);
  });
});

describe('sons du retournement (FR-004)', () => {
  const ten = [...Array<Rarity>(9).fill('common'), 'legendary' as Rarity]
    .map(r => ({ item: CATALOGUE.find(i => i.rarity === r)!, isNew: true, guaranteed: false, pity: false, shards: 0, featuredGuarantee: false }));

  it('×10 : un son par carte quand elle tourne, la vedette en dernier', () => {
    const schedule = flipSchedule(ten, flipOrder(ten));
    const cues = flipCues(schedule);
    expect(cues.map(c => c.cue)).toEqual([...Array<string>(9).fill('card'), 'star']);
    expect(cues.map(c => c.at)).toEqual(schedule.steps.map(s => s.at + s.anticipation));
    expect(cues[9]!.at).toBeGreaterThan(cues[8]!.at + FLIP_TIMING.starPause);
  });

  it('×1 : aucun', () => {
    expect(flipCues(flipSchedule(ten.slice(0, 1), [0]))).toEqual([]);
  });
});

describe('réglages du son (FR-007)', () => {
  it('par défaut, son actif', () => {
    expect(DEFAULT_SETTINGS).toEqual({ muted: false });
    expect(parseSettings(null)).toEqual({ muted: false });
  });

  it('aller-retour exact', () => {
    for (const muted of [true, false]) expect(parseSettings(serializeSettings({ muted }))).toEqual({ muted });
  });

  it('illisible ou mal typé : défaut', () => {
    for (const raw of ['{cassé', '42', 'null', '{}', '{"muted":"oui"}', '{"muted":1}']) {
      expect(parseSettings(raw), raw).toEqual({ muted: false });
    }
  });
});
