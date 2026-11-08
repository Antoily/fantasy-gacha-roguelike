import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../data/catalogue';
import type { Rarity } from '../data/gachaConfig';
import type { PullResult } from './gacha';
import { presentations } from './presentation';
import { flipOrder } from './reveal';

const res = (rarity: Rarity, n = 0): PullResult => ({
  item: CATALOGUE.filter(i => i.rarity === rarity)[n]!, isNew: true, guaranteed: false, pity: false, shards: 0,
  featuredGuarantee: false,
});

describe('présentations plein écran (007, FR-003)', () => {
  it('au ×1 : Légendaire et Ultra rare seulement', () => {
    for (const r of ['common', 'uncommon', 'rare'] as const) expect(presentations([res(r)], [0])).toEqual([]);
    expect(presentations([res('legendary')], [0])).toEqual([0]);
    expect(presentations([res('ultra')], [0])).toEqual([0]);
  });

  it('au ×10 : dans l’ordre de retournement, pas dans l’ordre du tirage', () => {
    const ten = [res('common'), res('ultra'), res('rare'), res('legendary'), res('common'),
      res('common'), res('uncommon'), res('common'), res('common'), res('common')];
    const order = flipOrder(ten);
    // L'Ultra rare (index 1) est la vedette : retourné en dernier, présenté en dernier.
    expect(presentations(ten, order)).toEqual([3, 1]);
  });

  it('le même élément tiré deux fois est présenté deux fois', () => {
    const ten = [res('legendary', 1), res('common'), res('legendary', 1), ...Array.from({ length: 7 }, () => res('common'))];
    expect(presentations(ten, flipOrder(ten))).toEqual([0, 2]);
  });

  it('aucune présentation sans Légendaire ni Ultra rare', () => {
    const ten = [res('rare'), ...Array.from({ length: 9 }, () => res('uncommon'))];
    expect(presentations(ten, flipOrder(ten))).toEqual([]);
  });
});
