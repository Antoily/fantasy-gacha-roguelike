import type { HeroDefinition, Rarity } from '../data/heroes';
import type { RelicDefinition } from '../data/relics';
import { HERO_POOL, getHeroesByRarity } from '../data/heroes';
import { RELIC_POOL, getRelicsByRarity } from '../data/relics';
import { weightedPick } from '../utils/random';

export const PITY_THRESHOLD = 80;

export type GachaPullType = 'hero' | 'relic';

export interface GachaPullResult {
  type: GachaPullType;
  rarity: Rarity;
  heroDefinition?: HeroDefinition;
  relicDefinition?: RelicDefinition;
  isPity: boolean;
}

const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3,
};

const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export class GachaSystem {
  private pullCount = 0;
  private pityCap: number;

  constructor(pityCap = PITY_THRESHOLD) {
    this.pityCap = pityCap;
  }

  get currentPullCount(): number { return this.pullCount; }
  get pullsUntilPity(): number { return this.pityCap - this.pullCount; }

  pull(unlockedHeroIds: string[], ownedRelicIds: string[]): GachaPullResult {
    this.pullCount++;
    const isPity = this.pullCount >= this.pityCap;
    const rarity: Rarity = isPity
      ? 'legendary'
      : weightedPick(RARITY_ORDER, RARITY_ORDER.map(r => RARITY_WEIGHTS[r]));

    if (isPity) this.pullCount = 0;

    // 50/50 hero vs relic, but prefer heroes if not all unlocked
    const allHeroes = getHeroesByRarity(rarity);
    const allRelics = getRelicsByRarity(rarity);
    const availableHeroes = allHeroes.filter(h => !unlockedHeroIds.includes(h.id));
    const availableRelics = allRelics.filter(r => !ownedRelicIds.includes(r.id));

    // Force hero if there are still unacquired heroes
    const forceHero = availableHeroes.length > 0 && Math.random() < 0.5;

    if (forceHero || availableRelics.length === 0) {
      const pool = availableHeroes.length > 0 ? availableHeroes : allHeroes;
      const hero = pool[Math.floor(Math.random() * pool.length)];
      return { type: 'hero', rarity, heroDefinition: hero, isPity };
    } else {
      const pool = availableRelics.length > 0 ? availableRelics : allRelics;
      const relic = pool[Math.floor(Math.random() * pool.length)];
      return { type: 'relic', rarity, relicDefinition: relic, isPity };
    }
  }

  pullMulti(count: number, unlockedHeroIds: string[], ownedRelicIds: string[]): GachaPullResult[] {
    const results: GachaPullResult[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.pull(unlockedHeroIds, ownedRelicIds));
    }
    return results;
  }

  costFor(count: number): number {
    return count === 1 ? 50 : count === 10 ? 450 : count * 50;
  }

  serialize(): { pullCount: number } {
    return { pullCount: this.pullCount };
  }

  load(data: { pullCount: number }): void {
    this.pullCount = data.pullCount;
  }
}

export { HERO_POOL, RELIC_POOL };
