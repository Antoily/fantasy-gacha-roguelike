import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue';
import { RARITIES, type Rarity } from '../data/gachaConfig';
import { REVEAL_TIMING as T } from '../data/revealConfig';
import { SOUND_RECIPES } from '../data/sounds';
import type { PullResult } from './gacha';
import { planReveal, revealDuration, type RevealPlan } from './reveal';
import { DEFAULT_SETTINGS, parseSettings, serializeSettings } from './settings';
import { flipCues, revealCues } from './soundCues';
import { scriptedRng } from './testing';

const res = (rarity: Rarity): PullResult =>
  ({ item: CATALOGUE.find(i => i.rarity === rarity)!, isNew: true, guaranteed: false, pity: false, shards: 0, featuredGuarantee: false });
const plan = (rarity: Rarity, u: number, v = 0.5): RevealPlan => planReveal([res(rarity)], scriptedRng([u, v]));
const names = (p: RevealPlan) => revealCues(p).map(c => c.cue);
const ALL: Rarity[] = RARITIES.map(r => r.id);

describe('sons de la révélation (FR-001 à FR-003)', () => {
  it('palier direct : suspense à 0, puis le palier à la fin du suspense', () => {
    for (const r of ALL) {
      expect(revealCues(plan(r, 0.9))).toEqual([{ at: 0, cue: 'suspense' }, { at: T.suspense, cue: `tier:${r}` }]);
    }
  });

  it('montée : faux palier, son de montée à la transition, vrai palier', () => {
    expect(revealCues(plan('legendary', 0))).toEqual([
      { at: 0, cue: 'suspense' },
      { at: T.suspense, cue: 'tier:rare' },
      { at: T.suspense + T.fakeStep, cue: 'rise' },
      { at: T.suspense + T.fakeStep + T.transition, cue: 'tier:legendary' },
    ]);
  });

  it('leurre : le rire quand l’effet se dégonfle, puis Rare', () => {
    expect(revealCues(plan('rare', 0.05, 0.1))).toEqual([
      { at: 0, cue: 'suspense' },
      { at: T.suspense, cue: 'tier:ultra' },
      { at: T.suspense + T.fakeStep, cue: 'laugh' },
      { at: T.suspense + T.fakeStep + T.transition, cue: 'tier:rare' },
    ]);
    expect(names(plan('rare', 0.05, 0.5))).toEqual(['suspense', 'tier:legendary', 'laugh', 'tier:rare']);
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
});

describe('sons du retournement (FR-004)', () => {
  it('×10 : 9 cartes aux instants du retournement, puis la vedette après la pause', () => {
    const cues = flipCues(10);
    expect(cues.map(c => c.cue)).toEqual([...Array<string>(9).fill('card'), 'star']);
    expect(cues.slice(0, 9).map(c => c.at)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => k * T.flipCard));
    expect(cues[9]!.at).toBe(9 * T.flipCard + T.flipPause);
  });

  it('×1 : aucun', () => {
    expect(flipCues(1)).toEqual([]);
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
