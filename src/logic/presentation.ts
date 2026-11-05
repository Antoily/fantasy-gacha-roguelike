import { RARITIES } from '../data/gachaConfig';
import { REVEAL_CONFIG } from '../data/revealConfig';
import type { PullResult } from './gacha';

const rankOf = (rarity: string) => RARITIES.find(r => r.id === rarity)!.rank;

// Présentations plein écran (007, FR-003) : les index des résultats Légendaire ou mieux,
// dans l'ordre de retournement donné (au ×1, [0]). Un même élément tiré deux fois est
// présenté deux fois.
export function presentations(results: readonly PullResult[], order: readonly number[]): number[] {
  return order.filter(i => rankOf(results[i]!.item.rarity) >= REVEAL_CONFIG.presentMinRank);
}
