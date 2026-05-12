export type HeroClass = 'warrior' | 'ranger' | 'mage' | 'priest' | 'assassin';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface HeroAbility {
  id: string;
  name: string;
  description: string;
  // Resolved at combat time by CombatResolver
  type: 'passive' | 'active';
}

export interface HeroDefinition {
  id: string;
  name: string;
  class: HeroClass;
  rarity: Rarity;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  ability: HeroAbility;
  lore: string;
  preferredRow: 'front' | 'mid' | 'back' | 'any';
}

export const HERO_POOL: HeroDefinition[] = [
  {
    id: 'aldric',
    name: 'Aldric le Rempart',
    class: 'warrior',
    rarity: 'legendary',
    baseHp: 200,
    baseAtk: 28,
    baseDef: 22,
    baseSpd: 7,
    preferredRow: 'front',
    lore: 'Ancien chevalier brisé, il avance encore, bouclier levé contre l\'obscurité.',
    ability: {
      id: 'iron_shield',
      name: 'Bouclier de Fer',
      description: 'Réduit les dégâts reçus de 35% si placé en rang avant. Attire les attaques ennemies.',
      type: 'passive',
    },
  },
  {
    id: 'sylva',
    name: 'Sylva l\'Oeil-d\'Aigle',
    class: 'ranger',
    rarity: 'epic',
    baseHp: 125,
    baseAtk: 48,
    baseDef: 10,
    baseSpd: 16,
    preferredRow: 'back',
    lore: 'Archère elfe exilée, son arc ne manque jamais sa cible.',
    ability: {
      id: 'piercing_shot',
      name: 'Tir Perçant',
      description: 'Ignore 50% de la DEF ennemie. +20% ATK en rang arrière.',
      type: 'passive',
    },
  },
  {
    id: 'zara',
    name: 'Zara la Flamme Noire',
    class: 'mage',
    rarity: 'epic',
    baseHp: 105,
    baseAtk: 55,
    baseDef: 7,
    baseSpd: 12,
    preferredRow: 'back',
    lore: 'Mage hérétique dont les sorts brûlent aussi bien les ennemis que sa propre âme.',
    ability: {
      id: 'fireball',
      name: 'Boule de Feu',
      description: 'Attaque toute la colonne ennemie ciblée. +10% ATK par ennemi dans la même colonne.',
      type: 'active',
    },
  },
  {
    id: 'finn',
    name: 'Frère Finn',
    class: 'priest',
    rarity: 'rare',
    baseHp: 115,
    baseAtk: 20,
    baseDef: 13,
    baseSpd: 10,
    preferredRow: 'mid',
    lore: 'Prêtre vagabond dont la foi vacille mais les soins restent infaillibles.',
    ability: {
      id: 'holy_light',
      name: 'Lumière Sacrée',
      description: 'Soigne l\'allié avec le moins de PV de 45 HP. Les alliés adjacents gagnent +5 DEF.',
      type: 'active',
    },
  },
  {
    id: 'shade',
    name: 'Shade l\'Ombre',
    class: 'assassin',
    rarity: 'epic',
    baseHp: 95,
    baseAtk: 60,
    baseDef: 5,
    baseSpd: 22,
    preferredRow: 'any',
    lore: 'Personne ne sait d\'où vient l\'Ombre. Tout le monde sait où elle frappe.',
    ability: {
      id: 'backstab',
      name: 'Backstab',
      description: 'Attaque les rangs arrière ennemis. +40% dégâts si la cible n\'a aucun allié adjacent.',
      type: 'active',
    },
  },
  {
    id: 'gorvak',
    name: 'Gorvak le Briseur',
    class: 'warrior',
    rarity: 'rare',
    baseHp: 160,
    baseAtk: 35,
    baseDef: 15,
    baseSpd: 9,
    preferredRow: 'front',
    lore: 'Barbare du nord, sa hache fendit plus de crânes que d\'arbres.',
    ability: {
      id: 'berserker_rage',
      name: 'Rage Berserk',
      description: '+5% ATK par tranche de 20% de PV perdus (max +25%).',
      type: 'passive',
    },
  },
  {
    id: 'lyra',
    name: 'Lyra la Tisseuse',
    class: 'mage',
    rarity: 'rare',
    baseHp: 95,
    baseAtk: 42,
    baseDef: 8,
    baseSpd: 14,
    preferredRow: 'back',
    lore: 'Fée demi-sang qui tisse la magie comme d\'autres tissent la soie.',
    ability: {
      id: 'arcane_weave',
      name: 'Tissage Arcane',
      description: 'Réduit l\'ATK d\'un ennemi de 20% pour 2 tours. Priorité aux ennemis à forte ATK.',
      type: 'active',
    },
  },
  {
    id: 'vex',
    name: 'Vex la Chasseuse',
    class: 'ranger',
    rarity: 'rare',
    baseHp: 110,
    baseAtk: 38,
    baseDef: 8,
    baseSpd: 13,
    preferredRow: 'back',
    lore: 'Chasseuse de primes qui n\'abandonne jamais une piste.',
    ability: {
      id: 'mark',
      name: 'Marquer',
      description: 'Marque un ennemi — toute l\'équipe inflige +15% dégâts contre lui.',
      type: 'active',
    },
  },
];

// Starter heroes given at run start (always available)
export const STARTER_HERO_IDS = ['aldric', 'sylva'];

export function getHeroById(id: string): HeroDefinition | undefined {
  return HERO_POOL.find(h => h.id === id);
}

export function getHeroesByRarity(rarity: Rarity): HeroDefinition[] {
  return HERO_POOL.filter(h => h.rarity === rarity);
}
