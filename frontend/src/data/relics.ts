import type { Rarity } from './heroes';

export interface RelicDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  // Applied by CombatResolver / RunManager
  effectType:
    | 'hp_flat'
    | 'atk_pct'
    | 'def_flat'
    | 'spd_flat'
    | 'gold_pct'
    | 'revive_once'
    | 'heal_per_room'
    | 'atk_pct_conditional'
    | 'class_dmg_pct';
  effectValue: number;
  effectCondition?: string; // e.g. "warrior", "alive_3"
}

export const RELIC_POOL: RelicDefinition[] = [
  {
    id: 'bloodstone_ring',
    name: 'Anneau de Sang',
    rarity: 'common',
    description: '+20 HP à tous les héros au début du run.',
    effectType: 'hp_flat',
    effectValue: 20,
  },
  {
    id: 'swiftness_boots',
    name: 'Bottes de Vivacité',
    rarity: 'rare',
    description: '+3 VIT à tous les héros.',
    effectType: 'spd_flat',
    effectValue: 3,
  },
  {
    id: 'war_banner',
    name: 'Étendard de Guerre',
    rarity: 'rare',
    description: '+12% ATK quand 3 héros ou plus sont encore en vie.',
    effectType: 'atk_pct_conditional',
    effectValue: 12,
    effectCondition: 'alive_3',
  },
  {
    id: 'shadow_cloak',
    name: 'Cape d\'Ombre',
    rarity: 'epic',
    description: 'Les assassins infligent +25% dégâts.',
    effectType: 'class_dmg_pct',
    effectValue: 25,
    effectCondition: 'assassin',
  },
  {
    id: 'ancient_tome',
    name: 'Tome Ancestral',
    rarity: 'epic',
    description: 'Les mages infligent +20% dégâts et touchent une colonne entière.',
    effectType: 'class_dmg_pct',
    effectValue: 20,
    effectCondition: 'mage',
  },
  {
    id: 'iron_fortress',
    name: 'Forteresse de Fer',
    rarity: 'epic',
    description: 'Les guerriers subissent -25% dégâts.',
    effectType: 'class_dmg_pct',
    effectValue: -25,
    effectCondition: 'warrior',
  },
  {
    id: 'emerald_pendant',
    name: 'Pendentif d\'Émeraude',
    rarity: 'rare',
    description: 'Récupère 8 HP par salle terminée.',
    effectType: 'heal_per_room',
    effectValue: 8,
  },
  {
    id: 'void_crystal',
    name: 'Cristal du Vide',
    rarity: 'legendary',
    description: 'Un héros revient à 30% PV après sa première mort (une fois par run).',
    effectType: 'revive_once',
    effectValue: 30,
  },
  {
    id: 'gold_idol',
    name: 'Idole d\'Or',
    rarity: 'rare',
    description: '+40% or de toutes les sources.',
    effectType: 'gold_pct',
    effectValue: 40,
  },
  {
    id: 'dragon_scale',
    name: 'Écaille de Dragon',
    rarity: 'legendary',
    description: '+18 DEF à tous les héros.',
    effectType: 'def_flat',
    effectValue: 18,
  },
  {
    id: 'berserker_heart',
    name: 'Cœur de Berserker',
    rarity: 'epic',
    description: '+8% ATK à chaque héros mort (stacks jusqu\'à 3).',
    effectType: 'atk_pct_conditional',
    effectValue: 8,
    effectCondition: 'per_dead',
  },
  {
    id: 'amulet_of_focus',
    name: 'Amulette de Concentration',
    rarity: 'common',
    description: '+6% ATK à tous les héros.',
    effectType: 'atk_pct',
    effectValue: 6,
  },
];

export function getRelicById(id: string): RelicDefinition | undefined {
  return RELIC_POOL.find(r => r.id === id);
}

export function getRelicsByRarity(rarity: Rarity): RelicDefinition[] {
  return RELIC_POOL.filter(r => r.rarity === rarity);
}
