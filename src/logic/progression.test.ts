import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue';
import { SHARD_COST } from '../data/gachaConfig';
import {
  activeBanner, cycleBanner, distinctOwned, exchange, hasFeaturedGuarantee, initialProgression, pull, pullsUntilPity,
  reset, type Progression,
} from './progression';
import { mulberry32 } from './rng';
import { scriptedRng } from './testing';

const totalCopies = (p: Progression) => Object.values(p.owned).reduce((a, b) => a + b, 0);

describe('progression initiale', () => {
  it('commence avec 9 000 et rien de possédé (US4-2)', () => {
    expect(initialProgression()).toEqual({ currency: 9000, owned: {}, pity: 0, shards: 0, banner: 'standard', guarantees: [] });
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
    const poor: Progression = { ...initialProgression(), currency: 99, owned: { gribouille: 1 }, pity: 5, shards: 3 };
    const snapshot = structuredClone(poor);
    expect(pull(poor, 1, mulberry32(1))).toEqual({ ok: false, reason: 'insufficient-funds' });
    expect(poor).toEqual(snapshot);
  });

  it('accepte un solde exactement égal au coût, qui tombe à 0', () => {
    const out = pull({ ...initialProgression(), currency: 100 }, 1, mulberry32(1));
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
    const p: Progression = { ...initialProgression(), currency: 899 };
    expect(pull(p, 10, mulberry32(1)).ok).toBe(false);
    expect(pull(p, 1, mulberry32(1)).ok).toBe(true);
  });
});

describe('compteur et remise à zéro', () => {
  it('compte les éléments différents, pas les exemplaires (US4-3)', () => {
    expect(distinctOwned({ ...initialProgression(), owned: { gribouille: 3, orbulle: 1 } })).toBe(2);
    expect(CATALOGUE).toHaveLength(20);
  });

  it('reset rend la progression initiale (FR-019)', () => {
    expect(reset()).toEqual({ currency: 9000, owned: {}, pity: 0, shards: 0, banner: 'standard', guarantees: [] });
  });
});

const allOwned = Object.fromEntries(CATALOGUE.map(i => [i.id, 1]));

describe('pity dans la progression (002, US1–US2)', () => {
  it('fait avancer le compteur et l’affiche en tirages restants (FR-006)', () => {
    expect(pullsUntilPity(initialProgression())).toBe(40);
    const out = pull(initialProgression(), 10, mulberry32(3));
    if (!out.ok) throw new Error('refusé');
    const lastHigh = out.results.map(r => r.item.rarity).lastIndexOf('legendary');
    const lastUltra = out.results.map(r => r.item.rarity).lastIndexOf('ultra');
    const last = Math.max(lastHigh, lastUltra);
    expect(out.progression.pity).toBe(last === -1 ? 10 : 9 - last);
    expect(pullsUntilPity(out.progression)).toBe(40 - out.progression.pity);
  });
});

describe('éclats dans la progression (002, US3)', () => {
  it('crédite la somme des éclats des résultats, avec le débit (FR-011)', () => {
    const start: Progression = { ...initialProgression(), owned: allOwned, shards: 7 };
    const out = pull(start, 10, mulberry32(9));
    if (!out.ok) throw new Error('refusé');
    const gained = out.results.reduce((sum, r) => sum + r.shards, 0);
    expect(gained).toBeGreaterThanOrEqual(10); // tout est doublon : au moins 1 par résultat
    expect(out.progression.shards).toBe(7 + gained);
    expect(out.progression.currency).toBe(8100);
  });
});

describe('échange d’éclats (002, US4)', () => {
  const missingLegendary: Progression = {
    ...initialProgression(),
    owned: Object.fromEntries(CATALOGUE.filter(i => i.id !== 'tonnerrouf').map(i => [i.id, 1])),
    shards: 160,
    pity: 12,
  };

  it('débite le coût de la rareté et rend l’élément possédé, sans toucher pièces ni pity', () => {
    const out = exchange(missingLegendary, 'tonnerrouf');
    if (!out.ok) throw new Error(out.reason);
    expect(out.progression.shards).toBe(160 - SHARD_COST.legendary);
    expect(out.progression.owned.tonnerrouf).toBe(1);
    expect(out.progression.currency).toBe(missingLegendary.currency);
    expect(out.progression.pity).toBe(12);
  });

  it.each([
    ['déjà possédé', 'gribouille', 'already-owned'],
    ['inconnu', 'personne', 'unknown-item'],
  ] as const)('refuse un élément %s sans rien changer', (_l, id, reason) => {
    const snapshot = structuredClone(missingLegendary);
    expect(exchange(missingLegendary, id)).toEqual({ ok: false, reason });
    expect(missingLegendary).toEqual(snapshot);
  });

  it('refuse quand le solde d’éclats est insuffisant (FR-015)', () => {
    const poor = { ...missingLegendary, shards: SHARD_COST.legendary - 1 };
    expect(exchange(poor, 'tonnerrouf')).toEqual({ ok: false, reason: 'insufficient-shards' });
    expect(exchange({ ...poor, shards: SHARD_COST.legendary }, 'tonnerrouf').ok).toBe(true);
  });

});

describe('bannières (006)', () => {
  const LEGENDARY = 0.98;
  const on = (banner: string, guarantees: string[] = []): Progression =>
    ({ ...initialProgression(), banner, guarantees });
  const ok = (out: ReturnType<typeof pull>) => {
    if (!out.ok) throw new Error('refusé');
    return out;
  };

  it('tire sur la bannière active (FR-005)', () => {
    const out = ok(pull(on('roi-barbichon'), 1, scriptedRng([LEGENDARY, 0.2])));
    expect(out.results[0]!.item.id).toBe('roi-barbichon');
    const std = ok(pull(on('standard'), 1, scriptedRng([LEGENDARY, 0.2])));
    expect(std.results[0]!.item.id).toBe('roi-barbichon'); // élément 0.2 × 3 → le premier
    const other = ok(pull(on('tonnerrouf'), 1, scriptedRng([LEGENDARY, 0.2])));
    expect(other.results[0]!.item.id).toBe('tonnerrouf');
  });

  it('ouvre puis referme la garantie de la bannière active', () => {
    const lost = ok(pull(on('roi-barbichon'), 1, scriptedRng([LEGENDARY, 0.7, 0])));
    expect(lost.progression.guarantees).toEqual(['roi-barbichon']);
    expect(hasFeaturedGuarantee(lost.progression)).toBe(true);
    const won = ok(pull(lost.progression, 1, scriptedRng([LEGENDARY])));
    expect(won.results[0]!.featuredGuarantee).toBe(true);
    expect(won.progression.guarantees).toEqual([]);
  });

  it('ne touche ni n’utilise la garantie d’une autre bannière (FR-014)', () => {
    const p = on('tonnerrouf', ['roi-barbichon']);
    // Légendaire sur Tonnerrouf, 50/50 perdu → Roi Barbichon tombe, mais pas par la garantie.
    const out = ok(pull(p, 1, scriptedRng([LEGENDARY, 0.7, 0])));
    expect(out.results[0]!.item.id).toBe('roi-barbichon');
    expect(out.results[0]!.featuredGuarantee).toBe(false);
    expect([...out.progression.guarantees].sort()).toEqual(['roi-barbichon', 'tonnerrouf']);
    const won = ok(pull(p, 1, scriptedRng([LEGENDARY, 0.2])));
    expect(won.progression.guarantees).toEqual(['roi-barbichon']);
  });

  it('partage le compteur des 40 entre les bannières (FR-013)', () => {
    const out = ok(pull({ ...on('orbulle'), pity: 25 }, 1, scriptedRng([0.1, 0])));
    expect(out.progression.pity).toBe(26);
    expect(pullsUntilPity(cycleBanner(out.progression, 1))).toBe(14);
  });

  it('change de bannière en boucle sans rien toucher d’autre (FR-004)', () => {
    const p = { ...on('standard', ['tonnerrouf']), pity: 7, shards: 12, currency: 500 };
    const next = cycleBanner(p, 1);
    expect(next).toEqual({ ...p, banner: 'roi-barbichon' });
    expect(cycleBanner(p, -1).banner).toBe('orbulle');
    expect(activeBanner(next).featured!.id).toBe('roi-barbichon');
  });

  it('n’annonce que la garantie de la bannière active (FR-015)', () => {
    expect(hasFeaturedGuarantee(on('roi-barbichon', ['roi-barbichon']))).toBe(true);
    expect(hasFeaturedGuarantee(on('tonnerrouf', ['roi-barbichon']))).toBe(false);
    expect(hasFeaturedGuarantee(on('standard', ['roi-barbichon']))).toBe(false);
  });

  it('retombe sur la standard pour une bannière inconnue', () => {
    expect(activeBanner(on('flambichon')).featured).toBeNull();
  });
});
