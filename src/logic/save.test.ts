import { describe, expect, it } from 'vitest';
import { initialProgression, type Progression } from './progression';
import { parseSave, SAVE_VERSION, serializeSave } from './save';

const sample: Progression = { currency: 8100, owned: { gribouille: 2, orbulle: 1 }, pity: 17, shards: 4 };

describe('sauvegarde (FR-018, ADR 0005)', () => {
  it('relit exactement ce qu’elle a écrit', () => {
    expect(parseSave(serializeSave(sample))).toEqual({ progression: sample, status: 'loaded' });
  });

  it('écrit un document versionné', () => {
    expect(JSON.parse(serializeSave(sample))).toEqual({ version: SAVE_VERSION, ...sample });
  });

  it('démarre une partie neuve quand rien n’est sauvegardé', () => {
    expect(parseSave(null)).toEqual({ progression: initialProgression(), status: 'new' });
  });

  it.each([
    ['JSON invalide', '{pas du json'],
    ['pas un objet', '42'],
    ['version inconnue', JSON.stringify({ version: 99, currency: 10, owned: {}, pity: 0, shards: 0 })],
    ['version absente', JSON.stringify({ currency: 10, owned: {} })],
    ['solde négatif', JSON.stringify({ version: 1, currency: -1, owned: {} })],
    ['solde non entier', JSON.stringify({ version: 1, currency: 1.5, owned: {} })],
    ['owned absent', JSON.stringify({ version: 1, currency: 10 })],
    ['compte nul', JSON.stringify({ version: 1, currency: 10, owned: { gribouille: 0 } })],
    ['compte non entier', JSON.stringify({ version: 1, currency: 10, owned: { gribouille: 1.5 } })],
  ])('signale une sauvegarde corrompue : %s', (_label, raw) => {
    expect(parseSave(raw)).toEqual({ progression: initialProgression(), status: 'corrupted' });
  });

  it.each([
    ['pity négatif', { pity: -1, shards: 0 }],
    ['pity au seuil', { pity: 40, shards: 0 }],
    ['pity non entier', { pity: 1.5, shards: 0 }],
    ['éclats négatifs', { pity: 0, shards: -2 }],
    ['éclats absents', { pity: 0 }],
  ])('signale une sauvegarde v2 corrompue : %s', (_label, extra) => {
    const raw = JSON.stringify({ version: 2, currency: 10, owned: {}, ...extra });
    expect(parseSave(raw).status).toBe('corrupted');
  });

  it('reprend une sauvegarde de la version 001 sans perte, pity 0 et 0 éclat (FR-020)', () => {
    const raw = JSON.stringify({ version: 1, currency: 4200, owned: { gribouille: 3, orbulle: 1 } });
    expect(parseSave(raw)).toEqual({
      progression: { currency: 4200, owned: { gribouille: 3, orbulle: 1 }, pity: 0, shards: 0 },
      status: 'loaded',
    });
  });

  it('ignore les identifiants absents du catalogue', () => {
    const raw = JSON.stringify({ version: 1, currency: 10, owned: { gribouille: 1, ancien: 4 } });
    expect(parseSave(raw).progression.owned).toEqual({ gribouille: 1 });
  });

  it('migre une sauvegarde d’une version antérieure', () => {
    // v0 fictive : le solde s'appelait « coins ». Prouve que la chaîne de migrations
    // est bien appliquée avant la validation.
    const migrations = {
      0: (d: Record<string, unknown>) => ({ version: 1, currency: d.coins, owned: d.owned }),
      1: (d: Record<string, unknown>) => ({ ...d, version: 2, pity: 0, shards: 0 }),
    };
    const raw = JSON.stringify({ version: 0, coins: 500, owned: { orbulle: 1 } });
    expect(parseSave(raw, migrations)).toEqual({
      progression: { currency: 500, owned: { orbulle: 1 }, pity: 0, shards: 0 },
      status: 'loaded',
    });
  });
});
