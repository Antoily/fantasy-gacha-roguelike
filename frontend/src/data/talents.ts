export type TalentTrack = 'survival' | 'power' | 'fortune';

export interface TalentNode {
  id: string;
  track: TalentTrack;
  name: string;
  description: string;
  cost: number; // talent points
  tier: 1 | 2 | 3;
  requires?: string; // parent node id
  effect: {
    type:
      | 'hp_bonus'
      | 'atk_pct'
      | 'start_relic'
      | 'revive_passive'
      | 'gold_bonus'
      | 'pity_reduction'
      | 'start_hero_slot'
      | 'start_gold';
    value: number;
  };
}

export const TALENT_TREE: TalentNode[] = [
  // ── Survival ──────────────────────────────────────────────
  {
    id: 'hp_bonus_1',
    track: 'survival',
    tier: 1,
    name: 'Constitution Renforcée',
    description: 'Tous les héros démarrent avec +15 PV.',
    cost: 3,
    effect: { type: 'hp_bonus', value: 15 },
  },
  {
    id: 'start_relic',
    track: 'survival',
    tier: 2,
    name: 'Héritage',
    description: 'Démarre chaque run avec une relique commune aléatoire.',
    cost: 5,
    requires: 'hp_bonus_1',
    effect: { type: 'start_relic', value: 1 },
  },
  {
    id: 'revive_passive',
    track: 'survival',
    tier: 3,
    name: 'Second Souffle',
    description: 'La première mort d\'un héros dans un run le rétablit à 40% PV (une fois).',
    cost: 10,
    requires: 'start_relic',
    effect: { type: 'revive_passive', value: 40 },
  },

  // ── Power ─────────────────────────────────────────────────
  {
    id: 'atk_pct_1',
    track: 'power',
    tier: 1,
    name: 'Entraînement Intensif',
    description: '+6% ATK pour tous les héros.',
    cost: 3,
    effect: { type: 'atk_pct', value: 6 },
  },
  {
    id: 'start_gold',
    track: 'power',
    tier: 2,
    name: 'Réserves de Guerre',
    description: 'Démarre chaque run avec 60 or supplémentaires.',
    cost: 5,
    requires: 'atk_pct_1',
    effect: { type: 'start_gold', value: 60 },
  },
  {
    id: 'atk_pct_2',
    track: 'power',
    tier: 3,
    name: 'Maîtrise des Armes',
    description: '+10% ATK supplémentaire pour tous les héros.',
    cost: 10,
    requires: 'start_gold',
    effect: { type: 'atk_pct', value: 10 },
  },

  // ── Fortune ───────────────────────────────────────────────
  {
    id: 'gold_bonus_1',
    track: 'fortune',
    tier: 1,
    name: 'Œil du Marchand',
    description: '+25% or de toutes les sources.',
    cost: 3,
    effect: { type: 'gold_bonus', value: 25 },
  },
  {
    id: 'pity_reduction',
    track: 'fortune',
    tier: 2,
    name: 'Destin Favorable',
    description: 'Le seuil de pity de la gacha est réduit de 10 tirages.',
    cost: 5,
    requires: 'gold_bonus_1',
    effect: { type: 'pity_reduction', value: 10 },
  },
  {
    id: 'extra_hero_slot',
    track: 'fortune',
    tier: 3,
    name: 'Grande Alliance',
    description: 'Peut recruter jusqu\'à 6 héros par run (au lieu de 5).',
    cost: 10,
    requires: 'pity_reduction',
    effect: { type: 'start_hero_slot', value: 1 },
  },
];

export function getTalentById(id: string): TalentNode | undefined {
  return TALENT_TREE.find(t => t.id === id);
}

export function getAvailableTalents(unlockedIds: string[]): TalentNode[] {
  return TALENT_TREE.filter(t => {
    if (unlockedIds.includes(t.id)) return false;
    if (!t.requires) return true;
    return unlockedIds.includes(t.requires);
  });
}
