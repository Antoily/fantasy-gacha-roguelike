import { TALENT_TREE, getAvailableTalents, getTalentById } from '../data/talents';
import type { TalentNode } from '../data/talents';

export interface TalentTreeState {
  unlockedIds: string[];
  totalPoints: number;
  spentPoints: number;
}

export class TalentTreeSystem {
  private state: TalentTreeState = {
    unlockedIds: [],
    totalPoints: 0,
    spentPoints: 0,
  };

  get availablePoints(): number {
    return this.state.totalPoints - this.state.spentPoints;
  }

  get unlockedIds(): string[] { return [...this.state.unlockedIds]; }

  addPoints(pts: number): void {
    this.state.totalPoints += pts;
  }

  canUnlock(nodeId: string): boolean {
    const node = getTalentById(nodeId);
    if (!node) return false;
    if (this.state.unlockedIds.includes(nodeId)) return false;
    if (node.requires && !this.state.unlockedIds.includes(node.requires)) return false;
    return this.availablePoints >= node.cost;
  }

  unlock(nodeId: string): boolean {
    if (!this.canUnlock(nodeId)) return false;
    const node = getTalentById(nodeId)!;
    this.state.unlockedIds.push(nodeId);
    this.state.spentPoints += node.cost;
    return true;
  }

  getAvailable(): TalentNode[] {
    return getAvailableTalents(this.state.unlockedIds);
  }

  getAll(): TalentNode[] {
    return TALENT_TREE;
  }

  // Returns bonus values aggregated from all unlocked nodes
  getBonuses(): {
    hpBonus: number;
    atkPct: number;
    goldBonusPct: number;
    startRelicCount: number;
    hasRevivePassive: boolean;
    reviveHpPct: number;
    startGold: number;
    pityReduction: number;
    extraHeroSlot: number;
  } {
    let hpBonus = 0, atkPct = 0, goldBonusPct = 0, startRelicCount = 0;
    let hasRevivePassive = false, reviveHpPct = 0, startGold = 0, pityReduction = 0, extraHeroSlot = 0;

    for (const id of this.state.unlockedIds) {
      const node = getTalentById(id);
      if (!node) continue;
      switch (node.effect.type) {
        case 'hp_bonus': hpBonus += node.effect.value; break;
        case 'atk_pct': atkPct += node.effect.value; break;
        case 'gold_bonus': goldBonusPct += node.effect.value; break;
        case 'start_relic': startRelicCount += node.effect.value; break;
        case 'revive_passive': hasRevivePassive = true; reviveHpPct = node.effect.value; break;
        case 'start_gold': startGold += node.effect.value; break;
        case 'pity_reduction': pityReduction += node.effect.value; break;
        case 'start_hero_slot': extraHeroSlot += node.effect.value; break;
      }
    }

    return { hpBonus, atkPct, goldBonusPct, startRelicCount, hasRevivePassive, reviveHpPct, startGold, pityReduction, extraHeroSlot };
  }

  serialize(): TalentTreeState {
    return { ...this.state };
  }

  load(state: TalentTreeState): void {
    this.state = { ...state };
  }
}
