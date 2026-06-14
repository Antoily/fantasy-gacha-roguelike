import type { HeroInstance } from '../entities/Hero';
import type { RelicDefinition } from '../data/relics';
import type { EnemyFormation } from '../data/enemies';
import type { EventDefinition } from '../data/events';
import { createHeroInstance } from '../entities/Hero';
import { getHeroById, STARTER_HERO_IDS } from '../data/heroes';
import { getRelicById } from '../data/relics';
import { ENEMY_FORMATIONS } from '../data/enemies';
import { EVENT_POOL } from '../data/events';
import { shuffle, pickRandom } from '../utils/random';

export type RoomType = 'combat' | 'event' | 'shop' | 'rest' | 'boss';

export interface Room {
  type: RoomType;
  completed: boolean;
  formation?: EnemyFormation;
  event?: EventDefinition;
  isBossRoom: boolean;
}

export interface RunState {
  heroes: HeroInstance[];
  relics: RelicDefinition[];
  gold: number;
  rooms: Room[];
  currentRoomIndex: number;
  zoneIndex: number;    // 0=zone1, 1=zone2, 2=zone3
  isOver: boolean;
  victory: boolean;
  talentPointsEarned: number;
  runReviveUsed: boolean;
  autoMode: boolean;    // run en pilote automatique : choix aléatoires + bonus d'or
}

const TOTAL_ZONES = 3;
export const MAX_TEAM = 5;    // taille maximale d'une équipe de run

function generateZoneRooms(_zoneIdx: number, _isFinalZone: boolean): Room[] {
  const roomTypes: RoomType[] = ['combat', 'combat', 'combat', 'combat', 'event', 'shop', 'rest', 'combat'];
  const shuffled = shuffle(roomTypes.slice(0, -1)); // keep last as boss-approach
  const rooms: Room[] = shuffled.map((type) => ({
    type,
    completed: false,
    isBossRoom: false,
    formation: type === 'combat' ? pickRandom(ENEMY_FORMATIONS) : undefined,
    event: type === 'event' ? pickRandom(EVENT_POOL) : undefined,
  }));

  // Final room in zone is always boss
  rooms.push({
    type: 'boss',
    completed: false,
    isBossRoom: true,
    formation: ENEMY_FORMATIONS.find(f => f.id === 'shield_wall') ?? ENEMY_FORMATIONS[0],
  });

  return rooms;
}

export class RunManager {
  private _state: RunState | null = null;

  get state(): RunState {
    if (!this._state) throw new Error('No active run');
    return this._state;
  }

  get isActive(): boolean { return this._state !== null && !this._state.isOver; }

  startRun(opts: {
    teamHeroIds: string[];
    hpBonus: number;
    atkPct: number;
    goldBonusPct: number;
    startRelicIds: string[];
    startGold: number;
    hasRevivePassive: boolean;
    reviveHpPct: number;
    extraHeroSlot: number;
    autoMode?: boolean;
  }): RunState {
    // Équipe choisie par le joueur (repli sur les starters si vide), héros valides uniquement, plafonnée
    const wanted = opts.teamHeroIds.length > 0 ? opts.teamHeroIds : STARTER_HERO_IDS;
    const heroIds = wanted.filter(id => getHeroById(id) !== undefined).slice(0, MAX_TEAM);
    const heroes: HeroInstance[] = heroIds.map(id => {
      const def = getHeroById(id)!;
      return createHeroInstance(def, opts.hpBonus, opts.atkPct, 0);
    });

    const relics: RelicDefinition[] = opts.startRelicIds
      .map(id => getRelicById(id))
      .filter((r): r is RelicDefinition => r !== undefined);

    // Apply relic HP bonuses at run start
    for (const relic of relics) {
      if (relic.effectType === 'hp_flat') {
        heroes.forEach(h => { h.maxHp += relic.effectValue; h.currentHp += relic.effectValue; });
      }
      if (relic.effectType === 'def_flat') {
        heroes.forEach(h => { h.def += relic.effectValue; });
      }
      if (relic.effectType === 'spd_flat') {
        heroes.forEach(h => { h.spd += relic.effectValue; });
      }
    }

    const rooms = generateZoneRooms(0, false);

    this._state = {
      heroes,
      relics,
      gold: 100 + opts.startGold,
      rooms,
      currentRoomIndex: 0,
      zoneIndex: 0,
      isOver: false,
      victory: false,
      talentPointsEarned: 0,
      runReviveUsed: false,
      autoMode: opts.autoMode ?? false,
    };

    return this._state;
  }

  get currentRoom(): Room {
    return this.state.rooms[this.state.currentRoomIndex];
  }

  completeRoom(rewards: { gold?: number; relicId?: string; heroId?: string; healAmount?: number } = {}): void {
    const s = this.state;
    s.rooms[s.currentRoomIndex].completed = true;

    if (rewards.gold) s.gold += rewards.gold;
    if (rewards.relicId) {
      const relic = getRelicById(rewards.relicId);
      if (relic) this.applyRelic(relic);
    }
    if (rewards.heroId) {
      const def = getHeroById(rewards.heroId);
      if (def) s.heroes.push(createHeroInstance(def, 0, 0, 0));
    }
    if (rewards.healAmount) {
      s.heroes.forEach(h => { h.currentHp = Math.min(h.maxHp, h.currentHp + (rewards.healAmount ?? 0)); });
    }

    // Emerald pendant: heal per room
    const pendant = s.relics.find(r => r.id === 'emerald_pendant');
    if (pendant) {
      s.heroes.forEach(h => { h.currentHp = Math.min(h.maxHp, h.currentHp + pendant.effectValue); });
    }

    s.talentPointsEarned += this.currentRoom.isBossRoom ? 3 : 1;

    // Advance to next room or zone
    if (s.currentRoomIndex < s.rooms.length - 1) {
      s.currentRoomIndex++;
    } else {
      // End of zone
      s.zoneIndex++;
      if (s.zoneIndex >= TOTAL_ZONES) {
        s.isOver = true;
        s.victory = true;
      } else {
        s.rooms = generateZoneRooms(s.zoneIndex, s.zoneIndex === TOTAL_ZONES - 1);
        s.currentRoomIndex = 0;
      }
    }
  }

  applyRelic(relic: RelicDefinition): void {
    const s = this.state;
    s.relics.push(relic);
    const h = s.heroes;
    switch (relic.effectType) {
      case 'hp_flat': h.forEach(hero => { hero.maxHp += relic.effectValue; hero.currentHp += relic.effectValue; }); break;
      case 'def_flat': h.forEach(hero => { hero.def += relic.effectValue; }); break;
      case 'spd_flat': h.forEach(hero => { hero.spd += relic.effectValue; }); break;
    }
  }

  endRun(victory: boolean): void {
    this.state.isOver = true;
    this.state.victory = victory;
  }

  heroesAllDead(): boolean {
    return this.state.heroes.every(h => h.currentHp <= 0);
  }

  getGoldMultiplier(): number {
    let mult = 1;
    const gold = this.state.relics.find(r => r.id === 'gold_idol');
    if (gold) mult += gold.effectValue / 100;
    // Mode auto : +30% d'or sur tous les gains de combat
    if (this.state.autoMode) mult += 0.30;
    return mult;
  }
}
