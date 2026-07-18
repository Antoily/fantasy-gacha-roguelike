import type { HeroInstance } from '../entities/Hero';
import type { EnemyInstance } from '../entities/Enemy';
import { isHeroAlive, healHero } from '../entities/Hero';
import { isEnemyAlive } from '../entities/Enemy';
import { randInt } from '../utils/random';

// Effet appliqué à une unité pendant une action — permet à la scène de combat
// de rejouer le déroulement en animation (barres de PV, dégâts flottants, morts)
export interface CombatEffect {
  unitId: string;
  kind: 'damage' | 'heal' | 'debuff';
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

const GRID_COLS = 3;

// Dégâts = ATK × aléa. Il n'y a pas de défense : ce qu'un héros encaisse se lit
// dans ses PV, ce qu'il inflige se lit dans son ATK. Rien à calculer pour le joueur.
function rollDamage(atk: number): number {
  return Math.max(1, randInt(Math.floor(atk * 0.85), Math.floor(atk * 1.15)));
}

function effectiveAtk(unit: { atk: number; atkDebuffPct: number }): number {
  return Math.max(1, Math.round(unit.atk * (1 - unit.atkDebuffPct / 100)));
}

// Place les héros automatiquement : tanks et bagarreurs devant, le reste derrière.
// Le joueur ne place jamais personne — c'est le rôle du héros qui décide.
export function autoPlaceHeroes(heroes: HeroInstance[]): void {
  const front = heroes.filter(h => h.row === 'front');
  const back = heroes.filter(h => h.row === 'back');

  front.forEach((h, i) => {
    h.gridRow = 0;
    h.gridCol = i % GRID_COLS;
  });
  // Rang 1 et non 2 : les héros n'occupent jamais que deux rangées, les coller
  // évite un trou visuel au milieu de la grille de combat.
  back.forEach((h, i) => {
    h.gridRow = i < GRID_COLS ? 1 : 2;
    h.gridCol = i % GRID_COLS;
  });
}

// ---- Ciblage ----

function pickHeroTarget(heroes: HeroInstance[], prefer: 'front' | 'back' | 'weakest' | 'any'): HeroInstance {
  const live = heroes.filter(isHeroAlive);

  // « Provocation » prime sur tout le reste : c'est le seul effet de ciblage
  // dont le joueur doit se souvenir.
  const taunt = live.find(h => h.abilityId === 'taunt');
  if (taunt) return taunt;

  if (prefer === 'weakest') {
    return live.reduce((min, h) => (h.currentHp < min.currentHp ? h : min), live[0]);
  }
  if (prefer === 'front') {
    return live.find(h => h.row === 'front') ?? live[0];
  }
  if (prefer === 'back') {
    return live.find(h => h.row === 'back') ?? live[0];
  }
  return live[0];
}

// ---- Application des dégâts ----

// Renvoie les dégâts réellement infligés, après les réductions d'équipe.
function damageHero(
  target: HeroInstance,
  raw: number,
  heroes: HeroInstance[],
  entry: CombatLogEntry,
  attacker?: EnemyInstance,
): void {
  let dmg = raw;

  // « Égide » : réduction d'équipe tant que le gardien est en vie
  const aegis = heroes.find(h => h.abilityId === 'aegis' && isHeroAlive(h));
  if (aegis) dmg = Math.max(1, Math.round(dmg * 0.75));

  target.currentHp = Math.max(0, target.currentHp - dmg);
  entry.effects.push({ unitId: target.instanceId, kind: 'damage', amount: dmg, hpAfter: target.currentHp });
  entry.damage = dmg;

  // « Carapace » : renvoie une part des dégâts à l'attaquant
  if (target.abilityId === 'thorns' && attacker && isEnemyAlive(attacker)) {
    const reflected = Math.max(1, Math.round(dmg * 0.30));
    attacker.currentHp = Math.max(0, attacker.currentHp - reflected);
    entry.effects.push({ unitId: attacker.instanceId, kind: 'damage', amount: reflected, hpAfter: attacker.currentHp });
    entry.special = 'Carapace';
  }
}

function damageEnemy(target: EnemyInstance, dmg: number, entry: CombatLogEntry, attacker?: HeroInstance): void {
  target.currentHp = Math.max(0, target.currentHp - dmg);
  entry.effects.push({ unitId: target.instanceId, kind: 'damage', amount: dmg, hpAfter: target.currentHp });

  // « Riposte » : le duelliste se renforce à chaque ennemi qu'il achève
  if (attacker?.abilityId === 'riposte' && target.currentHp <= 0) {
    attacker.atk += 4;
  }
}

// ---- Tour d'un héros ----

function heroAction(hero: HeroInstance, heroes: HeroInstance[], enemies: EnemyInstance[], entry: CombatLogEntry): void {
  const live = enemies.filter(isEnemyAlive);
  if (live.length === 0) return;
  const atk = effectiveAtk(hero);

  switch (hero.abilityId) {
    case 'heal_one': {
      const wounded = heroes.filter(isHeroAlive).reduce((min, h) => (h.currentHp / h.maxHp < min.currentHp / min.maxHp ? h : min));
      healHero(wounded, 50);
      entry.targetName = wounded.name;
      entry.heal = 50;
      entry.special = 'Lumière';
      entry.effects.push({ unitId: wounded.instanceId, kind: 'heal', amount: 50, hpAfter: wounded.currentHp });
      return;
    }
    case 'heal_all': {
      heroes.filter(isHeroAlive).forEach(h => {
        healHero(h, 20);
        entry.effects.push({ unitId: h.instanceId, kind: 'heal', amount: 20, hpAfter: h.currentHp });
      });
      entry.targetName = 'toute l\'équipe';
      entry.heal = 20;
      entry.special = 'Aube';
      return;
    }
    case 'weaken': {
      const strongest = live.reduce((max, e) => (effectiveAtk(e) > effectiveAtk(max) ? e : max), live[0]);
      strongest.atkDebuffPct = Math.min(50, strongest.atkDebuffPct + 50);
      entry.targetName = strongest.name;
      entry.special = 'Entrave';
      entry.effects.push({ unitId: strongest.instanceId, kind: 'debuff', amount: 50, hpAfter: strongest.currentHp });
      return;
    }
    case 'cleave': {
      // Tous les ennemis de la rangée la plus avancée encore occupée
      const frontRow = [0, 1, 2].map(r => live.filter(e => e.gridRow === r)).find(g => g.length > 0) ?? [live[0]];
      const dmg = rollDamage(atk);
      frontRow.forEach(e => damageEnemy(e, dmg, entry, hero));
      entry.targetName = `${frontRow.length} ennemi(s)`;
      entry.damage = dmg;
      entry.special = 'Fendoir';
      return;
    }
    case 'column': {
      const col = live[0].gridCol;
      const colEnemies = live.filter(e => e.gridCol === col);
      const dmg = rollDamage(atk);
      colEnemies.forEach(e => damageEnemy(e, dmg, entry, hero));
      entry.targetName = `colonne de ${colEnemies.length}`;
      entry.damage = dmg;
      entry.special = 'Brasier';
      return;
    }
    case 'double_shot': {
      const dmg1 = rollDamage(atk);
      const t1 = live[0];
      damageEnemy(t1, dmg1, entry, hero);
      const stillLive = enemies.filter(isEnemyAlive);
      if (stillLive.length > 0) {
        const t2 = stillLive[0];
        damageEnemy(t2, rollDamage(atk), entry, hero);
      }
      entry.targetName = t1.name;
      entry.damage = dmg1;
      entry.special = 'Tir Double';
      return;
    }
    case 'execute': {
      const target = live.reduce((min, e) => (e.currentHp < min.currentHp ? e : min), live[0]);
      const dmg = rollDamage(atk);
      damageEnemy(target, dmg, entry, hero);
      entry.targetName = target.name;
      entry.damage = dmg;
      entry.special = 'Curée';
      return;
    }
    case 'ambush': {
      const target = live[0];
      const intact = target.currentHp >= target.maxHp;
      const dmg = rollDamage(Math.round(atk * (intact ? 1.5 : 1)));
      damageEnemy(target, dmg, entry, hero);
      entry.targetName = target.name;
      entry.damage = dmg;
      if (intact) entry.special = 'Embuscade';
      return;
    }
    default: {
      // Attaque simple — tanks, Nix, Kael
      const target = live[0];
      const dmg = rollDamage(atk);
      damageEnemy(target, dmg, entry, hero);
      entry.targetName = target.name;
      entry.damage = dmg;
    }
  }
}

// ---- Tour d'un ennemi ----

function enemyAction(enemy: EnemyInstance, heroes: HeroInstance[], entry: CombatLogEntry): void {
  const live = heroes.filter(isHeroAlive);
  if (live.length === 0) return;
  const atk = effectiveAtk(enemy);

  if (enemy.pattern === 'aoe_row') {
    // Frappe toute la rangée avant des héros
    const targets = live.filter(h => h.row === 'front');
    const hit = targets.length > 0 ? targets : [live[0]];
    const dmg = rollDamage(atk);
    hit.forEach(h => damageHero(h, dmg, heroes, entry, enemy));
    entry.targetName = `${hit.length} héros`;
    entry.special = 'Attaque de zone';
    return;
  }

  let prefer: 'front' | 'back' | 'weakest' | 'any' = 'front';
  if (enemy.pattern === 'target_back') prefer = 'back';
  else if (enemy.pattern === 'target_lowest_hp') prefer = 'weakest';
  else if (enemy.pattern === 'cycle_attacks') {
    // Boss : alterne front / arrière / plus faible
    enemy.cycleIndex = (enemy.cycleIndex + 1) % 3;
    prefer = (['front', 'back', 'weakest'] as const)[enemy.cycleIndex];
  }

  const target = pickHeroTarget(heroes, prefer);
  damageHero(target, rollDamage(atk), heroes, entry, enemy);
  entry.targetName = target.name;
}

// ---- Boucle principale ----

export function resolveCombat(heroes: HeroInstance[], enemies: EnemyInstance[]): CombatResult {
  const log: CombatLogEntry[] = [];
  let turn = 0;
  const maxTurns = 200;

  autoPlaceHeroes(heroes);
  // Les affaiblissements ne survivent pas d'un combat à l'autre
  heroes.forEach(h => { h.atkDebuffPct = 0; });
  enemies.forEach(e => { e.atkDebuffPct = 0; });

  while (turn < maxTurns) {
    if (heroes.every(h => !isHeroAlive(h)) || enemies.every(e => !isEnemyAlive(e))) break;

    // Ordre du tour : VIT décroissante. « Fulgurance » passe devant tout le monde.
    const order: Array<{ hero?: HeroInstance; enemy?: EnemyInstance; spd: number }> = [
      ...heroes.filter(isHeroAlive).map(h => ({ hero: h, spd: h.abilityId === 'first_strike' ? Infinity : h.spd })),
      ...enemies.filter(isEnemyAlive).map(e => ({ enemy: e, spd: e.spd })),
    ].sort((a, b) => b.spd - a.spd);

    for (const slot of order) {
      const actor = slot.hero ?? slot.enemy!;
      const alive = slot.hero ? isHeroAlive(slot.hero) : isEnemyAlive(slot.enemy!);
      if (!alive) continue;
      if (heroes.every(h => !isHeroAlive(h)) || enemies.every(e => !isEnemyAlive(e))) break;

      turn++;
      const entry: CombatLogEntry = {
        turn,
        actorId: actor.instanceId,
        actorSide: slot.hero ? 'hero' : 'enemy',
        actorName: actor.name,
        targetName: '',
        damage: 0,
        heal: 0,
        special: '',
        effects: [],
      };

      if (slot.hero) heroAction(slot.hero, heroes, enemies, entry);
      else enemyAction(slot.enemy!, heroes, entry);

      log.push(entry);
    }
  }

  const victory = enemies.every(e => !isEnemyAlive(e));
  const goldReward = victory ? (enemies.some(e => e.isBoss) ? randInt(80, 120) : randInt(20, 40)) : 0;

  return { victory, log, goldReward, survivingHeroes: heroes.filter(isHeroAlive) };
}
