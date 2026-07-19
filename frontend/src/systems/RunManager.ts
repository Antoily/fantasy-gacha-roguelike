import type { HeroInstance } from '../entities/Hero';
import type { EnemyFormation } from '../data/enemies';
import { createHeroInstance, isHeroAlive } from '../entities/Hero';
import { getHeroById, STARTER_HERO_IDS, HERO_POOL } from '../data/heroes';
import { ENEMY_FORMATIONS } from '../data/enemies';
import { shuffle, pickRandom } from '../utils/random';

// Une salle ne propose jamais qu'un seul type de décision : choisir des héros.
// 'recruit' = en enrôler un parmi trois · 'rest' = en soigner · le reste est du combat.
export type RoomType = 'combat' | 'recruit' | 'rest' | 'boss';

export interface Room {
  type: RoomType;
  completed: boolean;
  formation?: EnemyFormation;
  // Héros proposés dans une salle de renfort (tirés à la génération de la zone,
  // pour que l'offre soit stable si le joueur revient sur la carte)
  offers?: string[];
  isBossRoom: boolean;
}

export interface RunState {
  heroes: HeroInstance[];
  gold: number;
  rooms: Room[];
  currentRoomIndex: number;
  zoneIndex: number;
  isOver: boolean;
  victory: boolean;
  autoMode: boolean;
}

const TOTAL_ZONES = 3;

// Équipe de quatre : assez pour composer, assez petit pour que chaque place compte.
export const MAX_TEAM = 4;

// Nombre de héros proposés dans une salle de renfort
export const RECRUIT_CHOICES = 3;

function pickOffers(excludeIds: string[]): string[] {
  const pool = HERO_POOL.filter(h => !excludeIds.includes(h.id));
  return shuffle(pool).slice(0, RECRUIT_CHOICES).map(h => h.id);
}

function generateZoneRooms(teamIds: string[]): Room[] {
  // Rythme d'une zone : on se bat, on récupère, on recrute, puis le boss.
  const types: RoomType[] = ['combat', 'recruit', 'combat', 'rest', 'combat', 'recruit', 'combat'];
  const rooms: Room[] = types.map(type => ({
    type,
    completed: false,
    isBossRoom: false,
    formation: type === 'combat' ? pickRandom(ENEMY_FORMATIONS) : undefined,
    offers: type === 'recruit' ? pickOffers(teamIds) : undefined,
  }));

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

  startRun(opts: { teamHeroIds: string[]; autoMode?: boolean }): RunState {
    const wanted = opts.teamHeroIds.length > 0 ? opts.teamHeroIds : STARTER_HERO_IDS;
    const heroIds = wanted.filter(id => getHeroById(id) !== undefined).slice(0, MAX_TEAM);
    const heroes = heroIds.map(id => createHeroInstance(getHeroById(id)!));

    this._state = {
      heroes,
      gold: 0,
      rooms: generateZoneRooms(heroIds),
      currentRoomIndex: 0,
      zoneIndex: 0,
      isOver: false,
      victory: false,
      autoMode: opts.autoMode ?? false,
    };

    return this._state;
  }

  get currentRoom(): Room {
    return this.state.rooms[this.state.currentRoomIndex];
  }

  // Ajoute un héros à l'équipe. Si elle est pleine, `replaceInstanceId` indique
  // qui laisse sa place — c'est LA décision du joueur pendant un run.
  recruitHero(heroId: string, replaceInstanceId?: string): boolean {
    const s = this.state;
    const def = getHeroById(heroId);
    if (!def) return false;

    if (s.heroes.length >= MAX_TEAM) {
      if (!replaceInstanceId) return false;
      const idx = s.heroes.findIndex(h => h.instanceId === replaceInstanceId);
      if (idx === -1) return false;
      s.heroes.splice(idx, 1);
    }

    s.heroes.push(createHeroInstance(def));
    return true;
  }

  healTeam(amount: number): void {
    this.state.heroes.forEach(h => {
      if (isHeroAlive(h)) h.currentHp = Math.min(h.maxHp, h.currentHp + amount);
    });
  }

  completeRoom(rewards: { gold?: number } = {}): void {
    const s = this.state;
    s.rooms[s.currentRoomIndex].completed = true;
    if (rewards.gold) s.gold += rewards.gold;

    if (s.currentRoomIndex < s.rooms.length - 1) {
      s.currentRoomIndex++;
    } else {
      s.zoneIndex++;
      if (s.zoneIndex >= TOTAL_ZONES) {
        s.isOver = true;
        s.victory = true;
      } else {
        s.rooms = generateZoneRooms(s.heroes.map(h => h.definitionId));
        s.currentRoomIndex = 0;
      }
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
    return this.state.autoMode ? 1.30 : 1;
  }
}
