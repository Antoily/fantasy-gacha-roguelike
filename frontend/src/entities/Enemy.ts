import type { EnemyDefinition, EnemyPattern } from '../data/enemies';

export interface EnemyInstance {
  instanceId: string;
  definitionId: string;
  name: string;
  pattern: EnemyPattern;
  isBoss: boolean;
  maxHp: number;
  currentHp: number;
  atk: number;
  def: number;
  spd: number;
  gridRow: number;
  gridCol: number;
  isMarked: boolean;
  atkDebuffPct: number;
  // boss cycle counter
  cycleIndex: number;
}

let _counter = 0;

export function createEnemyInstance(def: EnemyDefinition, row: number, col: number): EnemyInstance {
  return {
    instanceId: `enemy_${++_counter}_${def.id}`,
    definitionId: def.id,
    name: def.name,
    pattern: def.pattern,
    isBoss: def.isBoss,
    maxHp: def.hp,
    currentHp: def.hp,
    atk: def.atk,
    def: def.def,
    spd: def.spd,
    gridRow: row,
    gridCol: col,
    isMarked: false,
    atkDebuffPct: 0,
    cycleIndex: 0,
  };
}

export function isEnemyAlive(enemy: EnemyInstance): boolean {
  return enemy.currentHp > 0;
}
