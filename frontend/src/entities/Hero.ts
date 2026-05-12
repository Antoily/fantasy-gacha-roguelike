import type { HeroDefinition, Rarity, HeroClass } from '../data/heroes';

export interface HeroInstance {
  instanceId: string;
  definitionId: string;
  name: string;
  class: HeroClass;
  rarity: Rarity;
  abilityId: string;
  // Current combat stats (modified by relics/talents/abilities)
  maxHp: number;
  currentHp: number;
  atk: number;
  def: number;
  spd: number;
  // Grid position during combat (row 0=front, 2=back; col 0-2)
  gridRow: number | null;
  gridCol: number | null;
  // Temporary combat flags
  isMarked: boolean;
  atkDebuffPct: number; // 0-100
  reviveUsed: boolean;
}

let _instanceCounter = 0;

export function createHeroInstance(def: HeroDefinition, bonusHp = 0, bonusAtkPct = 0, bonusDef = 0): HeroInstance {
  const hp = def.baseHp + bonusHp;
  const atk = Math.round(def.baseAtk * (1 + bonusAtkPct / 100));
  return {
    instanceId: `hero_${++_instanceCounter}_${def.id}`,
    definitionId: def.id,
    name: def.name,
    class: def.class,
    rarity: def.rarity,
    abilityId: def.ability.id,
    maxHp: hp,
    currentHp: hp,
    atk,
    def: def.baseDef + bonusDef,
    spd: def.baseSpd,
    gridRow: null,
    gridCol: null,
    isMarked: false,
    atkDebuffPct: 0,
    reviveUsed: false,
  };
}

export function isHeroAlive(hero: HeroInstance): boolean {
  return hero.currentHp > 0;
}

export function healHero(hero: HeroInstance, amount: number): void {
  hero.currentHp = Math.min(hero.maxHp, hero.currentHp + amount);
}
