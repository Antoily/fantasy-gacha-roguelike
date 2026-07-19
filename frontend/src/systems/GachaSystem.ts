import type { HeroDefinition, Rarity } from '../data/heroes';
import { getHeroesByRarity } from '../data/heroes';
import { weightedPick } from '../utils/random';

export const PITY_THRESHOLD = 80;

// Le gacha ne distribue que des héros : c'est la seule progression méta du jeu,
// et le seul endroit d'où vient la puissance (via de meilleurs personnages).
export interface GachaPullResult {
  rarity: Rarity;
  heroDefinition: HeroDefinition;
  // Vrai si le héros était déjà débloqué — le tirage est alors converti en or
  isDuplicate: boolean;
  goldRefund: number;
  isPity: boolean;
}

const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3,
};

const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

// Un doublon ne doit pas être une déception sèche : il rend de l'or,
// donc il rapproche du prochain tirage.
const DUPLICATE_REFUND: Record<Rarity, number> = {
  common: 10,
  rare: 20,
  epic: 40,
  legendary: 80,
};

export class GachaSystem {
  private pullCount = 0;
  private pityCap: number;

  constructor(pityCap = PITY_THRESHOLD) {
    this.pityCap = pityCap;
  }

  get pullsUntilPity(): number { return this.pityCap - this.pullCount; }

  pull(unlockedHeroIds: string[]): GachaPullResult {
    this.pullCount++;
    const isPity = this.pullCount >= this.pityCap;
    const rarity: Rarity = isPity
      ? 'legendary'
      : weightedPick(RARITY_ORDER, RARITY_ORDER.map(r => RARITY_WEIGHTS[r]));

    if (isPity) this.pullCount = 0;

    const all = getHeroesByRarity(rarity);
    const locked = all.filter(h => !unlockedHeroIds.includes(h.id));
    // On privilégie toujours un héros non débloqué : le joueur doit sentir
    // que tirer élargit vraiment son choix d'équipe.
    const pool = locked.length > 0 ? locked : all;
    const hero = pool[Math.floor(Math.random() * pool.length)];
    const isDuplicate = locked.length === 0;

    return {
      rarity,
      heroDefinition: hero,
      isDuplicate,
      goldRefund: isDuplicate ? DUPLICATE_REFUND[rarity] : 0,
      isPity,
    };
  }

  pullMulti(count: number, unlockedHeroIds: string[]): GachaPullResult[] {
    const results: GachaPullResult[] = [];
    // Copie locale : deux tirages d'une même salve ne doivent pas rendre le même héros
    const unlocked = [...unlockedHeroIds];
    for (let i = 0; i < count; i++) {
      const r = this.pull(unlocked);
      if (!r.isDuplicate) unlocked.push(r.heroDefinition.id);
      results.push(r);
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
