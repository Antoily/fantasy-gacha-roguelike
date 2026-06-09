import type { HeroInstance } from '../entities/Hero';
import type { EnemyInstance } from '../entities/Enemy';
import type { RelicDefinition } from '../data/relics';
import { isHeroAlive, healHero } from '../entities/Hero';
import { isEnemyAlive } from '../entities/Enemy';
import { randInt } from '../utils/random';

// Effet appliqué à une unité pendant une action — permet à la scène de combat
// de rejouer le déroulement en animation (barres de PV, dégâts flottants, morts)
export interface CombatEffect {
  unitId: string;
  kind: 'damage' | 'heal' | 'debuff' | 'mark' | 'revive';
  amount: number;
  hpAfter: number;
}

export interface CombatLogEntry {
  turn: number;
  actorId: string;
  actorSide: 'hero' | 'enemy';
  actorName: string;
  targetName: string;
  damage: number;
  heal: number;
  special: string;
  effects: CombatEffect[];
}

export interface CombatResult {
  victory: boolean;
  log: CombatLogEntry[];
  goldReward: number;
  survivingHeroes: HeroInstance[];
}

interface CombatUnit {
  type: 'hero' | 'enemy';
  hero?: HeroInstance;
  enemy?: EnemyInstance;
  get id(): string;
  get name(): string;
  get hp(): number;
  get maxHp(): number;
  get atk(): number;
  get def(): number;
  get spd(): number;
  get row(): number;
  get col(): number;
  get alive(): boolean;
}

function wrapHero(h: HeroInstance): CombatUnit {
  return {
    type: 'hero',
    hero: h,
    get id() { return h.instanceId; },
    get name() { return h.name; },
    get hp() { return h.currentHp; },
    get maxHp() { return h.maxHp; },
    get atk() { return Math.round(h.atk * (1 - (h.atkDebuffPct ?? 0) / 100)); },
    get def() { return h.def; },
    get spd() { return h.spd; },
    get row() { return h.gridRow ?? 0; },
    get col() { return h.gridCol ?? 0; },
    get alive() { return isHeroAlive(h); },
  };
}

function wrapEnemy(e: EnemyInstance): CombatUnit {
  return {
    type: 'enemy',
    enemy: e,
    get id() { return e.instanceId; },
    get name() { return e.name; },
    get hp() { return e.currentHp; },
    get maxHp() { return e.maxHp; },
    get atk() { return Math.round(e.atk * (1 - (e.atkDebuffPct ?? 0) / 100)); },
    get def() { return e.def; },
    get spd() { return e.spd; },
    get row() { return e.gridRow; },
    get col() { return e.gridCol; },
    get alive() { return isEnemyAlive(e); },
  };
}

function calcDamage(atk: number, def: number, defPiercePct = 0): number {
  const effectiveDef = def * (1 - defPiercePct / 100);
  const base = Math.max(1, atk - effectiveDef * 0.5);
  return randInt(Math.floor(base * 0.85), Math.floor(base * 1.15));
}

function applyDamage(unit: CombatUnit, dmg: number, relics: RelicDefinition[]): number {
  let finalDmg = dmg;
  if (unit.type === 'hero' && unit.hero) {
    // Warrior relic reduction
    const fortress = relics.find(r => r.id === 'iron_fortress');
    if (fortress && unit.hero.class === 'warrior') {
      finalDmg = Math.round(finalDmg * (1 + fortress.effectValue / 100)); // effectValue is negative
    }
    unit.hero.currentHp = Math.max(0, unit.hero.currentHp - finalDmg);
  } else if (unit.type === 'enemy' && unit.enemy) {
    unit.enemy.currentHp = Math.max(0, unit.enemy.currentHp - finalDmg);
  }
  return finalDmg;
}

// Returns heroes adjacent (orthogonally) to a given position
function adjacentHeroes(row: number, col: number, heroes: HeroInstance[]): HeroInstance[] {
  return heroes.filter(h =>
    isHeroAlive(h) &&
    h.gridRow !== null && h.gridCol !== null &&
    ((Math.abs((h.gridRow ?? 0) - row) === 1 && h.gridCol === col) ||
     (Math.abs((h.gridCol ?? 0) - col) === 1 && h.gridRow === row))
  );
}

function adjacentEnemies(row: number, col: number, enemies: EnemyInstance[]): EnemyInstance[] {
  return enemies.filter(e =>
    isEnemyAlive(e) &&
    ((Math.abs(e.gridRow - row) === 1 && e.gridCol === col) ||
     (Math.abs(e.gridCol - col) === 1 && e.gridRow === row))
  );
}

export function resolveCombat(
  heroes: HeroInstance[],
  enemies: EnemyInstance[],
  relics: RelicDefinition[],
  goldMultiplier = 1,
  runReviveUsed = false,
): CombatResult {
  const log: CombatLogEntry[] = [];
  let turn = 0;
  const maxTurns = 60;

  // Apply passive abilities at combat start
  heroes.forEach(h => {
    // Ranger: +20% ATK in back row
    if (h.abilityId === 'piercing_shot' && h.gridRow === 2) {
      h.atk = Math.round(h.atk * 1.20);
    }
    // Priest: adjacent allies +5 DEF
    if (h.abilityId === 'holy_light') {
      const adj = adjacentHeroes(h.gridRow ?? 0, h.gridCol ?? 0, heroes);
      adj.forEach(a => { a.def += 5; });
    }
    // Warrior taunt: handled in targeting
  });

  while (turn < maxTurns) {
    const livingHeroes = heroes.filter(isHeroAlive);
    const livingEnemies = enemies.filter(isEnemyAlive);
    if (livingHeroes.length === 0 || livingEnemies.length === 0) break;

    // Build turn order sorted by SPD desc
    const allUnits: CombatUnit[] = [
      ...livingHeroes.map(wrapHero),
      ...livingEnemies.map(wrapEnemy),
    ].sort((a, b) => b.spd - a.spd);

    for (const actor of allUnits) {
      if (!actor.alive) continue;
      const lH = heroes.filter(isHeroAlive);
      const lE = enemies.filter(isEnemyAlive);
      if (lH.length === 0 || lE.length === 0) break;

      turn++;
      const entry: CombatLogEntry = {
        turn,
        actorId: actor.id,
        actorSide: actor.type,
        actorName: actor.name,
        targetName: '',
        damage: 0,
        heal: 0,
        special: '',
        effects: [],
      };

      if (actor.type === 'hero' && actor.hero) {
        const hero = actor.hero;
        const atkMultiplier = getHeroAtkMultiplier(hero, relics, lH);

        switch (hero.abilityId) {
          case 'holy_light': {
            // Heal lowest HP ally
            const target = lH.reduce((min, h) => h.currentHp < min.currentHp ? h : min, lH[0]);
            const healAmt = 45;
            healHero(target, healAmt);
            entry.targetName = target.name;
            entry.heal = healAmt;
            entry.special = 'Lumière Sacrée';
            entry.effects.push({ unitId: target.instanceId, kind: 'heal', amount: healAmt, hpAfter: target.currentHp });
            break;
          }
          case 'fireball': {
            // AOE column attack
            const targetCol = lE[0].gridCol;
            const colEnemies = lE.filter(e => e.gridCol === targetCol);
            const dmgEach = calcDamage(Math.round(hero.atk * atkMultiplier), lE[0].def);
            colEnemies.forEach(e => {
              e.currentHp = Math.max(0, e.currentHp - dmgEach);
              entry.effects.push({ unitId: e.instanceId, kind: 'damage', amount: dmgEach, hpAfter: e.currentHp });
            });
            entry.targetName = `Colonne ${targetCol}`;
            entry.damage = dmgEach;
            entry.special = 'Boule de Feu';
            break;
          }
          case 'backstab': {
            // Target back row enemies, bonus if isolated
            const backRow = lE.filter(e => e.gridRow === 2);
            const target = backRow.length > 0 ? backRow[0] : lE[0];
            const adjCount = adjacentEnemies(target.gridRow, target.gridCol, lE).length;
            const bonus = adjCount === 0 ? 1.40 : 1.0;
            const dmg = calcDamage(Math.round(hero.atk * atkMultiplier * bonus), target.def);
            applyDamage(wrapEnemy(target), dmg, relics);
            entry.targetName = target.name;
            entry.damage = dmg;
            entry.special = adjCount === 0 ? 'Backstab (isolé ×1.4)' : 'Backstab';
            entry.effects.push({ unitId: target.instanceId, kind: 'damage', amount: dmg, hpAfter: target.currentHp });
            break;
          }
          case 'arcane_weave': {
            // Debuff highest ATK enemy
            const hAtk = lE.reduce((max, e) => e.atk > max.atk ? e : max, lE[0]);
            hAtk.atkDebuffPct = Math.min(100, (hAtk.atkDebuffPct ?? 0) + 20);
            entry.targetName = hAtk.name;
            entry.special = 'Tissage Arcane (-20% ATK)';
            entry.effects.push({ unitId: hAtk.instanceId, kind: 'debuff', amount: 20, hpAfter: hAtk.currentHp });
            break;
          }
          case 'mark': {
            // Mark highest HP enemy
            const hHp = lE.reduce((max, e) => e.currentHp > max.currentHp ? e : max, lE[0]);
            hHp.isMarked = true;
            entry.targetName = hHp.name;
            entry.special = 'Marqué (+15% dégâts équipe)';
            entry.effects.push({ unitId: hHp.instanceId, kind: 'mark', amount: 0, hpAfter: hHp.currentHp });
            break;
          }
          default: {
            // Attaque standard sur le premier ennemi vivant
            const target = lE[0];
            const defPierce = hero.abilityId === 'piercing_shot' ? 50 : 0;
            let dmg = calcDamage(Math.round(hero.atk * atkMultiplier), target.def, defPierce);
            // Bonus de marque (capacité "mark")
            if (target.isMarked) dmg = Math.round(dmg * 1.15);
            applyDamage(wrapEnemy(target), dmg, relics);
            entry.targetName = target.name;
            entry.damage = dmg;
            entry.effects.push({ unitId: target.instanceId, kind: 'damage', amount: dmg, hpAfter: target.currentHp });
          }
        }
      } else if (actor.type === 'enemy' && actor.enemy) {
        const enemy = actor.enemy;
        const lH2 = heroes.filter(isHeroAlive);
        if (lH2.length === 0) break;

        let target: HeroInstance;
        switch (enemy.pattern) {
          case 'rush_front':
            target = lH2.find(h => h.gridRow === 0) ?? lH2[0];
            break;
          case 'target_back':
            target = lH2.reduce((back, h) => (h.gridRow ?? 0) > (back.gridRow ?? 0) ? h : back, lH2[0]);
            break;
          case 'target_lowest_hp':
            target = lH2.reduce((min, h) => h.currentHp < min.currentHp ? h : min, lH2[0]);
            break;
          case 'front_tank':
            target = lH2.find(h => h.gridRow === 0) ?? lH2[0];
            break;
          case 'aoe_row': {
            // Hit first row that has heroes
            const rows = [0, 1, 2];
            let rowTargets: HeroInstance[] = [];
            for (const r of rows) {
              rowTargets = lH2.filter(h => h.gridRow === r);
              if (rowTargets.length > 0) break;
            }
            const dmgEach = calcDamage(enemy.atk, rowTargets[0]?.def ?? 10);
            rowTargets.forEach(h => {
              const finalDmg = applyDamage(wrapHero(h), dmgEach, relics);
              entry.effects.push({ unitId: h.instanceId, kind: 'damage', amount: finalDmg, hpAfter: h.currentHp });
            });
            entry.targetName = `Rang ${rowTargets[0]?.gridRow ?? 0}`;
            entry.damage = dmgEach;
            entry.special = 'Attaque de zone';
            log.push(entry);
            checkRevive(heroes, relics, runReviveUsed, log, turn);
            continue;
          }
          case 'cycle_attacks':
            // Boss: cycle between rush_front, aoe_row, target_back
            enemy.cycleIndex = (enemy.cycleIndex + 1) % 3;
            if (enemy.cycleIndex === 1) {
              target = lH2.find(h => h.gridRow === 0) ?? lH2[0];
            } else if (enemy.cycleIndex === 2) {
              target = lH2.reduce((back, h) => (h.gridRow ?? 0) > (back.gridRow ?? 0) ? h : back, lH2[0]);
            } else {
              target = lH2.reduce((min, h) => h.currentHp < min.currentHp ? h : min, lH2[0]);
            }
            break;
          default:
            target = lH2[0];
        }

        // Warrior iron shield: reduce dmg by 35% if in front
        let dmg = calcDamage(enemy.atk, target.def);
        if (target.abilityId === 'iron_shield' && target.gridRow === 0) {
          dmg = Math.round(dmg * 0.65);
        }
        const finalDmg = applyDamage(wrapHero(target), dmg, relics);
        entry.targetName = target.name;
        entry.damage = finalDmg;
        entry.effects.push({ unitId: target.instanceId, kind: 'damage', amount: finalDmg, hpAfter: target.currentHp });
        checkRevive(heroes, relics, runReviveUsed, log, turn);
      }

      log.push(entry);
    }
  }

  const victory = enemies.every(e => !isEnemyAlive(e));
  const baseGold = victory ? (enemies.some(e => e.isBoss) ? randInt(80, 120) : randInt(20, 40)) : 0;
  const gold = Math.round(baseGold * goldMultiplier);

  return {
    victory,
    log,
    goldReward: gold,
    survivingHeroes: heroes.filter(isHeroAlive),
  };
}

function getHeroAtkMultiplier(hero: HeroInstance, relics: RelicDefinition[], liveHeroes: HeroInstance[]): number {
  let mult = 1;

  // War banner: +12% if 3+ alive
  const banner = relics.find(r => r.id === 'war_banner');
  if (banner && liveHeroes.length >= 3) mult += 0.12;

  // Class relics
  const shadow = relics.find(r => r.id === 'shadow_cloak');
  if (shadow && hero.class === 'assassin') mult += shadow.effectValue / 100;

  const tome = relics.find(r => r.id === 'ancient_tome');
  if (tome && hero.class === 'mage') mult += tome.effectValue / 100;

  // Amulet: global +6%
  const amulet = relics.find(r => r.id === 'amulet_of_focus');
  if (amulet) mult += amulet.effectValue / 100;

  // Berserker heart: +8% per dead (max 3 stacks, handled elsewhere)
  const dead = 5 - liveHeroes.length;
  const bHeart = relics.find(r => r.id === 'berserker_heart');
  if (bHeart) mult += Math.min(dead, 3) * (bHeart.effectValue / 100);

  // Berserker rage ability
  if (hero.abilityId === 'berserker_rage') {
    const lostPct = 1 - hero.currentHp / hero.maxHp;
    const stacks = Math.floor(lostPct / 0.2);
    mult += stacks * 0.05;
  }

  return mult;
}

function checkRevive(heroes: HeroInstance[], relics: RelicDefinition[], runReviveUsed: boolean, log: CombatLogEntry[], turn: number): void {
  if (runReviveUsed) return;
  const crystal = relics.find(r => r.id === 'void_crystal');
  if (!crystal) return;
  for (const h of heroes) {
    if (h.currentHp <= 0 && !h.reviveUsed) {
      h.currentHp = Math.round(h.maxHp * crystal.effectValue / 100);
      h.reviveUsed = true;
      log.push({
        turn,
        actorId: h.instanceId,
        actorSide: 'hero',
        actorName: h.name,
        targetName: h.name,
        damage: 0,
        heal: h.currentHp,
        special: 'Cristal du Vide — résurrection',
        effects: [{ unitId: h.instanceId, kind: 'revive', amount: h.currentHp, hpAfter: h.currentHp }],
      });
      return; // only one revive per crystal activation
    }
  }
}
