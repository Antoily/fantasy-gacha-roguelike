import type { Rarity } from './gachaConfig';

export type ItemKind = 'character' | 'creature';

export interface Item {
  // Clé de la sauvegarde : ne jamais renommer un id existant sans migration.
  readonly id: string;
  readonly name: string;
  readonly kind: ItemKind;
  readonly rarity: Rarity;
  readonly blurb: string;
}

// Contenu provisoire (specs/001-tirage/catalogue.md), revu avec l'univers définitif.
export const CATALOGUE: readonly Item[] = [
  { id: 'gribouille', name: 'Gribouille', kind: 'character', rarity: 'common', blurb: 'Apprenti peintre qui tache tout ce qu\'il touche.' },
  { id: 'mirette', name: 'Mirette', kind: 'character', rarity: 'common', blurb: 'Marchande de bonbons qui goûte plus qu\'elle ne vend.' },
  { id: 'bidule', name: 'Bidule', kind: 'character', rarity: 'common', blurb: 'Bricoleur qui répare tout avec du scotch.' },
  { id: 'pataplouf', name: 'Pataplouf', kind: 'creature', rarity: 'common', blurb: 'Grenouille qui gonfle comme un ballon quand elle a peur.' },
  { id: 'croquinet', name: 'Croquinet', kind: 'creature', rarity: 'common', blurb: 'Hamster aux joues toujours pleines.' },
  { id: 'gloups', name: 'Gloups', kind: 'creature', rarity: 'common', blurb: 'Petite gelée verte qui avale les chaussettes.' },
  { id: 'capitaine-tartine', name: 'Capitaine Tartine', kind: 'character', rarity: 'uncommon', blurb: 'Pirate des cuisines, armé d\'une louche.' },
  { id: 'zigzag', name: 'Zigzag', kind: 'character', rarity: 'uncommon', blurb: 'Coursier en patins qui ne freine jamais.' },
  { id: 'dame-petunia', name: 'Dame Pétunia', kind: 'character', rarity: 'uncommon', blurb: 'Jardinière dont les fleurs répondent.' },
  { id: 'ronronflette', name: 'Ronronflette', kind: 'creature', rarity: 'uncommon', blurb: 'Chat-nuage qui ronronne de la pluie fine.' },
  { id: 'machouille', name: 'Mâchouille', kind: 'creature', rarity: 'uncommon', blurb: 'Crocodile en peluche, plus collant que méchant.' },
  { id: 'professeur-fizz', name: 'Professeur Fizz', kind: 'character', rarity: 'rare', blurb: 'Savant dont les potions pétillent un peu trop.' },
  { id: 'lulu-tempete', name: 'Lulu Tempête', kind: 'character', rarity: 'rare', blurb: 'Météorologue qui transporte son orage en bocal.' },
  { id: 'flambichon', name: 'Flambichon', kind: 'creature', rarity: 'rare', blurb: 'Dragonnet frisé qui crache des étincelles.' },
  { id: 'coquillard', name: 'Coquillard', kind: 'creature', rarity: 'rare', blurb: 'Bernard-l\'ermite géant logé dans une théière.' },
  { id: 'roi-barbichon', name: 'Roi Barbichon', kind: 'character', rarity: 'legendary', blurb: 'Monarque minuscule à la barbe interminable.' },
  { id: 'marquise-cerise', name: 'Marquise Cerise', kind: 'character', rarity: 'legendary', blurb: 'Escrimeuse élégante, toujours un fruit à la main.' },
  { id: 'tonnerrouf', name: 'Tonnerrouf', kind: 'creature', rarity: 'legendary', blurb: 'Chien-orage dont chaque aboiement fait un éclair.' },
  { id: 'cosmo-l-infini', name: 'Cosmo l\'Infini', kind: 'character', rarity: 'ultra', blurb: 'Astronaute qui a fait le tour de l\'univers en trottinette.' },
  { id: 'orbulle', name: 'Orbulle', kind: 'creature', rarity: 'ultra', blurb: 'Baleine-bulle qui nage entre les étoiles.' },
];
