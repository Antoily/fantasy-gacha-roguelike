import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue';
import { distinctOwned, initialProgression, pull, reset, type Progression } from './progression';
import { mulberry32 } from './rng';

const totalCopies = (p: Progression) => Object.values(p.owned).reduce((a, b) => a + b, 0);

describe('progression initiale', () => {
  it('commence avec 9 000 et rien de possédé (US4-2)', () => {
    expect(initialProgression()).toEqual({ currency: 9000, owned: {} });
    expect(distinctOwned(initialProgression())).toBe(0);
  });
});

describe('tirage ×1 (US1)', () => {
  it('débite exactement 100 et ajoute un exemplaire', () => {
    const out = pull(initialProgression(), 1, mulberry32(1));
    if (!out.ok) throw new Error('refusé');
    expect(out.progression.currency).toBe(8900);
    expect(totalCopies(out.progression)).toBe(1);
    expect(out.progression.owned[out.results[0]!.item.id]).toBe(1);
  });

  it('incrémente le compte d’un élément déjà possédé (FR-014)', () => {
    const first = pull(initialProgression(), 1, mulberry32(4));
    if (!first.ok) throw new Error('refusé');
    const id = first.results[0]!.item.id;
    const again = pull(first.progression, 1, mulberry32(4));
    if (!again.ok) throw new Error('refusé');
    expect(again.results[0]!.item.id).toBe(id);
    expect(again.progression.owned[id]).toBe(2);
  });

  it('refuse sans rien changer quand le solde est insuffisant (FR-010)', () => {
    const poor: Progression = { currency: 99, owned: { gribouille: 1 } };
    const snapshot = structuredClone(poor);
    expect(pull(poor, 1, mulberry32(1))).toEqual({ ok: false, reason: 'insufficient-funds' });
    expect(poor).toEqual(snapshot);
  });

  it('accepte un solde exactement égal au coût, qui tombe à 0', () => {
    const out = pull({ currency: 100, owned: {} }, 1, mulberry32(1));
    expect(out.ok && out.progression.currency).toBe(0);
  });

  it('ne modifie jamais l’état reçu', () => {
    const before = initialProgression();
    const snapshot = structuredClone(before);
    pull(before, 10, mulberry32(2));
    expect(before).toEqual(snapshot);
  });
});

describe('tirage ×10 (US2)', () => {
  it('débite exactement 900 et ajoute les dix résultats', () => {
    const out = pull(initialProgression(), 10, mulberry32(6));
    if (!out.ok) throw new Error('refusé');
    expect(out.progression.currency).toBe(8100);
    expect(out.results).toHaveLength(10);
    expect(totalCopies(out.progression)).toBe(10);
    for (const r of out.results) expect(out.progression.owned[r.item.id]).toBeGreaterThanOrEqual(1);
  });

  it('refuse le ×10 mais accepte le ×1 entre 100 et 899 (US2-4)', () => {
    const p: Progression = { currency: 899, owned: {} };
    expect(pull(p, 10, mulberry32(1)).ok).toBe(false);
    expect(pull(p, 1, mulberry32(1)).ok).toBe(true);
  });
});

describe('compteur et remise à zéro', () => {
  it('compte les éléments différents, pas les exemplaires (US4-3)', () => {
    expect(distinctOwned({ currency: 0, owned: { gribouille: 3, orbulle: 1 } })).toBe(2);
    expect(CATALOGUE).toHaveLength(20);
  });

  it('reset rend la progression initiale (FR-019)', () => {
    expect(reset()).toEqual({ currency: 9000, owned: {} });
  });
});
