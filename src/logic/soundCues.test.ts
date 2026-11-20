import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue';
import { RARITIES, type Rarity } from '../data/gachaConfig';
import { FLIP_TIMING, REVEAL_TIMING as T } from '../data/revealConfig';
import {
  CRACK_GAINS, GLITTER, SOUND_RECIPES, SOUND_RELEASE_MS, UI_SOUND_LIMITS, impact, recipeEnd, recipeEnergy, soundRecipe,
  toneEnd, toneEnergy, type OscTone, type Tone,
} from '../data/sounds';
import type { PullResult } from './gacha';
import { flipOrder, flipSchedule, planReveal, revealDuration, type RevealPlan } from './reveal';
import { DEFAULT_SETTINGS, parseSettings, serializeSettings } from './settings';
import { RISE_SEMITONES, beatTimes, crackTimes, flipCues, revealCues } from './soundCues';
import { scriptedRng } from './testing';

const res = (rarity: Rarity): PullResult =>
  ({ item: CATALOGUE.find(i => i.rarity === rarity)!, isNew: true, guaranteed: false, pity: false, shards: 0, featuredGuarantee: false });
const plan = (rarity: Rarity, u: number, v = 0.5): RevealPlan => planReveal([res(rarity)], scriptedRng([u, v]));
const names = (p: RevealPlan) => revealCues(p).map(c => c.cue);
const ALL: Rarity[] = RARITIES.map(r => r.id);
// Début de toute révélation : la sirène, puis un craquement à chaque fissure (FR-016), qui
// porte son rang (FR-017 : de plus en plus fort).
const OPENING = [{ at: 0, cue: 'suspense' }, ...crackTimes().map((at, index) => ({ at, cue: 'crack', variant: { kind: 'crack', index } }))];
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
      // Le vrai palier, un ton plus haut (FR-019).
      { at: T.suspense + T.fakeStep + T.transition, cue: 'tier:legendary', variant: { kind: 'tier', semitones: RISE_SEMITONES } },
    ]);
    expect(RISE_SEMITONES).toBe(2);
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

  it('fin audible : début + durée + relâche (par défaut SOUND_RELEASE_MS)', () => {
    const t: Tone = { wave: 'noise', at: 10, dur: 100, gain: 1, release: 30 };
    expect(recipeEnd([t])).toBe(140);
    expect(recipeEnd([t, { wave: 'noise', at: 50, dur: 100, gain: 1 }])).toBe(50 + 100 + SOUND_RELEASE_MS);
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

  // FR-017 : la sirène grossit, le cœur bat à chaque pulsation du halo, et tout se tait au
  // temps figé (130 ms de vrai silence au moins).
  it('suspense : crescendo, un battement par pulsation, rien dans le temps figé', () => {
    const tones = SOUND_RECIPES.suspense;
    const siren = tones.at(-1)! as OscTone;
    expect(siren.gainTo! / siren.gain).toBeGreaterThanOrEqual(2);
    // La sirène et sa couche s'arrêtent au temps figé, avec une relâche courte ; le reste
    // (souffle, battements) s'est tu avant.
    for (const t of tones) {
      const frozen = t.at + t.dur === T.suspense - T.freeze ? T.suspense - 130 : T.suspense - T.freeze;
      expect(toneEnd(t), JSON.stringify(t)).toBeLessThanOrEqual(frozen);
    }
    expect(siren.at + siren.dur).toBe(T.suspense - T.freeze);
    // Un coup sourd (glissando vers le grave) à chaque battement, de plus en plus fort.
    const thumps = tones.filter((t): t is OscTone => t.wave === 'sine' && t.to !== undefined && t.to < t.freq);
    expect(thumps.map(t => t.at)).toEqual(beatTimes());
    expect(thumps.map(t => t.gain)).toEqual([...thumps.map(t => t.gain)].sort((a, b) => a - b));
    expect(thumps[0]!.gain).toBeLessThan(thumps.at(-1)!.gain);
    // La sirène se creuse à chaque fissure, pour la laisser claquer.
    expect(siren.dips).toEqual(crackTimes());
    // Les battements tombent entre l'entrée et le temps figé, de plus en plus rapprochés.
    const b = beatTimes();
    expect(b[0]!).toBeGreaterThan(0);
    for (let i = 2; i < b.length; i++) expect(b[i]! - b[i - 1]!).toBeLessThanOrEqual(b[i - 1]! - b[i - 2]!);
  });

  it('fissures : de plus en plus fortes, la dernière au niveau par défaut', () => {
    const energies = crackTimes().map((_, index) => recipeEnergy(soundRecipe('crack', { kind: 'crack', index })));
    expect(energies[0]!).toBeLessThan(energies[1]!);
    expect(energies[1]!).toBeLessThan(energies[2]!);
    expect(energies[2]).toBeCloseTo(recipeEnergy(SOUND_RECIPES.crack), 9);
    expect(CRACK_GAINS.at(-1)).toBe(1);
  });

  // FR-018 : un impact dès l'éclat, plus fort avec le rang, un grondement dès Légendaire ;
  // et chaque palier pèse plus que le précédent.
  it('paliers : impact à l’éclat, croissant avec le rang ; grondement dès Légendaire', () => {
    const peaks = [0, 1, 2, 3, 4].map(k => recipeEnergy(impact(k)));
    for (let k = 1; k < 5; k++) expect(peaks[k]!, `k=${k}`).toBeGreaterThan(peaks[k - 1]!);
    const rumble = (k: number) => impact(k).some(t => t.wave === 'noise' && t.filter?.type === 'lowpass');
    expect([0, 1, 2, 3, 4].map(rumble)).toEqual([false, false, false, true, true]);
    for (const r of ALL) {
      const tones = SOUND_RECIPES[`tier:${r}`];
      // Le transitoire part avec l'éclair.
      expect(tones.some(t => t.at === 0 && t.wave === 'noise' && t.filter?.type === 'highpass'), r).toBe(true);
    }
    const energy = ALL.map(r => recipeEnergy(SOUND_RECIPES[`tier:${r}`]));
    for (let i = 1; i < energy.length; i++) expect(energy[i]!, ALL[i]).toBeGreaterThan(energy[i - 1]!);
  });

  it('montée : le vrai palier transposé d’un ton, le bruit inchangé', () => {
    const base = SOUND_RECIPES['tier:legendary'];
    const up = soundRecipe('tier:legendary', { kind: 'tier', semitones: 2 });
    expect(up).toHaveLength(base.length);
    up.forEach((t, i) => {
      const b = base[i]!;
      if (t.wave === 'noise' || b.wave === 'noise') expect(t).toEqual(b);
      else expect(t.freq / b.freq).toBeCloseTo(2 ** (2 / 12), 6);
    });
    // La montée finit, relâche comprise, à l'éclat suivant.
    expect(recipeEnd(SOUND_RECIPES.rise)).toBeLessThanOrEqual(T.transition);
    // Sans variante, ou avec celle d'un autre bruitage : la recette par défaut.
    expect(soundRecipe('tier:rare')).toBe(SOUND_RECIPES['tier:rare']);
    expect(soundRecipe('rise', { kind: 'tier', semitones: 2 })).toBe(SOUND_RECIPES.rise);
  });

  // B6 : les paillettes accompagnent la pluie d'étoiles (de +400 ms à 200 ms avant la fin),
  // calculées une fois à graine fixe (identiques d'un chargement à l'autre).
  it('paillettes : Légendaire et Ultra seulement, dans la pluie d’étoiles', () => {
    const sparkles = (r: Rarity) => SOUND_RECIPES[`tier:${r}`].filter(t => t.wave === 'sine' && t.freq >= 2000 && t.dur <= 30);
    expect(sparkles('rare')).toHaveLength(0);
    for (const r of ['legendary', 'ultra'] as const) {
      const s = sparkles(r);
      const span = T.final[r] - GLITTER.beforeEnd - GLITTER.from;
      expect(s.length, r).toBe(Math.round((GLITTER.perSecond[r] * span) / 1000));
      for (const t of s) {
        expect(t.at, r).toBeGreaterThanOrEqual(GLITTER.from);
        expect(toneEnd(t), r).toBeLessThanOrEqual(T.final[r] - GLITTER.beforeEnd);
      }
      expect(new Set(s.map(t => t.at)).size, r).toBe(s.length);
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
