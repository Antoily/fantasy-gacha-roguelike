import { CATALOGUE, type Item } from '../data/catalogue';
import { GACHA_CONFIG, RARITIES } from '../data/gachaConfig';

export const STANDARD = 'standard';

// La standard tire comme avant 006 ; une bannière vedette met son élément en avant.
export type Banner =
  | { readonly id: typeof STANDARD; readonly featured: null }
  | { readonly id: string; readonly featured: Item };

const rankOf = (item: Item) => RARITIES.find(r => r.id === item.rarity)!.rank;

// Dérivée du catalogue (research R2) : pas de texte à écrire par bannière, et l'id de
// la vedette, déjà clé de la sauvegarde, sert d'id de bannière.
const BANNERS: readonly Banner[] = [
  { id: STANDARD, featured: null },
  ...CATALOGUE.filter(i => rankOf(i) >= GACHA_CONFIG.featuredMinRank).map(item => ({ id: item.id, featured: item })),
];

export function bannerList(): readonly Banner[] {
  return BANNERS;
}

export function findBanner(id: string): Banner | undefined {
  return BANNERS.find(b => b.id === id);
}

// Voisine en boucle, dans les deux sens (FR-004). Une bannière inconnue repart de la standard.
export function neighbourBanner(id: string, step: 1 | -1): Banner {
  const i = Math.max(0, BANNERS.findIndex(b => b.id === id));
  return BANNERS[(i + step + BANNERS.length) % BANNERS.length]!;
}
