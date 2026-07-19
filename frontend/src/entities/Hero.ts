import type { HeroDefinition, Rarity, HeroRole, HeroRow } from '../data/heroes';

export interface HeroInstance {
  instanceId: string;
  definitionId: string;
  name: string;
  short: string;
  role: HeroRole;
  rarity: Rarity;
  row: HeroRow;
  abilityId: string;
  maxHp: number;
  currentHp: number;
  atk: number;
  spd: number;
  // Position sur la grille, assignée automatiquement au début du combat
  gridRow: number | null;
  gridCol: number | null;
  // Drapeaux de combat, remis à zéro à chaque combat
  atkDebuffPct: number; // 0-100
  parryUsed: boolean;   // « Parade » : la première attaque a déjà été ignorée
  reviveUsed: boolean;  // « Rappel » : le relèvement a déjà servi ce combat
}

let _instanceCounter = 0;

export function createHeroInstance(def: HeroDefinition): HeroInstance {
  return {
    instanceId: `hero_${++_instanceCounter}_${def.id}`,
    definitionId: def.id,
    name: def.name,
    short: def.short,
    role: def.role,
    rarity: def.rarity,
    row: def.row,
    abilityId: def.ability.id,
    maxHp: def.hp,
    currentHp: def.hp,
    atk: def.atk,
    spd: def.spd,
    gridRow: null,
    gridCol: null,
    atkDebuffPct: 0,
    parryUsed: false,
    reviveUsed: false,
  };
}

export function isHeroAlive(hero: HeroInstance): boolean {
  return hero.currentHp > 0;
}

export function healHero(hero: HeroInstance, amount: number): void {
  hero.currentHp = Math.min(hero.maxHp, hero.currentHp + amount);
}
