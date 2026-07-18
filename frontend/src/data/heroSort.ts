import type { HeroDefinition, HeroRole, Rarity } from './heroes';

// Tris partagés par la collection et la composition d'équipe : les deux écrans
// servent à comparer des héros, ils doivent trier de la même façon.
export interface HeroSort {
  id: string;
  label: string;
  compare: (a: HeroDefinition, b: HeroDefinition) => number;
}

const RARITY_ORDER: Record<Rarity, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
const ROLE_ORDER: Record<HeroRole, number> = { tank: 0, dps: 1, heal: 2, support: 3 };

// Départage systématique par nom : sans cela, deux héros de même rareté
// changent de place d'un affichage à l'autre.
const byName = (a: HeroDefinition, b: HeroDefinition) => a.short.localeCompare(b.short);

export const HERO_SORTS: HeroSort[] = [
  {
    id: 'rarity',
    label: 'Rareté',
    compare: (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || byName(a, b),
  },
  {
    id: 'role',
    label: 'Rôle',
    compare: (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || byName(a, b),
  },
  {
    id: 'atk',
    label: 'ATK',
    compare: (a, b) => b.atk - a.atk || byName(a, b),
  },
  {
    id: 'hp',
    label: 'PV',
    compare: (a, b) => b.hp - a.hp || byName(a, b),
  },
];

export function sortHeroes(heroes: HeroDefinition[], sortId: string): HeroDefinition[] {
  const sort = HERO_SORTS.find(s => s.id === sortId) ?? HERO_SORTS[0];
  return [...heroes].sort(sort.compare);
}
