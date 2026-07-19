export type HeroRole = 'tank' | 'dps' | 'heal' | 'support';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

// Rangée de combat — déduite du héros, jamais choisie par le joueur.
// Le placement n'est pas une décision de jeu : seul le choix des héros l'est.
export type HeroRow = 'front' | 'back';

export interface HeroAbility {
  id: string;
  name: string;
  // Une seule phrase, un seul effet. Si une compétence demande deux phrases,
  // c'est qu'elle est trop compliquée pour ce jeu.
  text: string;
}

export interface HeroDefinition {
  id: string;
  name: string;
  // Nom court pour les cartes et la grille de combat. Explicite plutôt que
  // déduit du premier mot : « Frère Finn » doit s'afficher « Finn ».
  short: string;
  role: HeroRole;
  rarity: Rarity;
  row: HeroRow;
  hp: number;
  atk: number;
  spd: number;
  ability: HeroAbility;
  lore: string;
}

export const ROLE_LABELS: Record<HeroRole, string> = {
  tank: 'Tank',
  dps: 'Attaque',
  heal: 'Soin',
  support: 'Soutien',
};

export const ROLE_ICONS: Record<HeroRole, string> = {
  tank: '🛡',
  dps: '⚔',
  heal: '💚',
  support: '✨',
};

// 12 héros. Chacun : 3 stats et UN effet.
// L'équilibrage se lit sur une seule ligne — c'est le but : le joueur doit
// pouvoir comparer deux héros d'un coup d'œil, sans calcul.
export const HERO_POOL: HeroDefinition[] = [
  // ---- Tanks (rang avant) ----
  {
    id: 'aldric',
    name: 'Aldric le Rempart',
    short: 'Aldric',
    role: 'tank', rarity: 'legendary', row: 'front',
    hp: 220, atk: 22, spd: 6,
    ability: { id: 'taunt', name: 'Provocation', text: 'Les ennemis l\'attaquent en priorité.' },
    lore: 'Ancien chevalier brisé, il avance encore, bouclier levé.',
  },
  {
    id: 'thane',
    name: 'Thane le Gardien',
    short: 'Thane',
    role: 'tank', rarity: 'epic', row: 'front',
    hp: 180, atk: 18, spd: 7,
    ability: { id: 'aegis', name: 'Égide', text: 'L\'équipe subit 25% de dégâts en moins tant qu\'il est vivant.' },
    lore: 'Il ne frappe pas fort. Il fait tenir les autres debout.',
  },
  {
    id: 'brann',
    name: 'Brann le Colosse',
    short: 'Brann',
    role: 'tank', rarity: 'rare', row: 'front',
    hp: 200, atk: 20, spd: 5,
    ability: { id: 'thorns', name: 'Carapace', text: 'Renvoie 30% des dégâts qu\'il subit.' },
    lore: 'Frapper Brann, c\'est se frapper soi-même.',
  },

  // ---- Attaque ----
  {
    id: 'gorvak',
    name: 'Gorvak le Briseur',
    short: 'Gorvak',
    role: 'dps', rarity: 'rare', row: 'front',
    hp: 170, atk: 30, spd: 8,
    ability: { id: 'cleave', name: 'Fendoir', text: 'Frappe tous les ennemis du rang avant.' },
    lore: 'Barbare du nord, sa hache fendit plus de crânes que d\'arbres.',
  },
  {
    id: 'shade',
    name: 'Shade l\'Ombre',
    short: 'Shade',
    role: 'dps', rarity: 'epic', row: 'back',
    hp: 95, atk: 46, spd: 20,
    ability: { id: 'execute', name: 'Curée', text: 'Attaque l\'ennemi le plus blessé.' },
    lore: 'Personne ne sait d\'où vient l\'Ombre. Tout le monde sait où elle frappe.',
  },
  {
    id: 'zara',
    name: 'Zara la Flamme Noire',
    short: 'Zara',
    role: 'dps', rarity: 'epic', row: 'back',
    hp: 100, atk: 34, spd: 12,
    ability: { id: 'column', name: 'Brasier', text: 'Frappe toute une colonne ennemie.' },
    lore: 'Ses sorts brûlent les ennemis autant que sa propre âme.',
  },
  {
    id: 'sylva',
    name: 'Sylva l\'Œil-d\'Aigle',
    short: 'Sylva',
    role: 'dps', rarity: 'epic', row: 'back',
    hp: 110, atk: 26, spd: 16,
    ability: { id: 'double_shot', name: 'Tir Double', text: 'Attaque deux fois par tour.' },
    lore: 'Archère elfe exilée, son arc ne manque jamais sa cible.',
  },
  {
    id: 'vex',
    name: 'Vex la Chasseuse',
    short: 'Vex',
    role: 'dps', rarity: 'rare', row: 'back',
    hp: 110, atk: 36, spd: 13,
    ability: { id: 'ambush', name: 'Embuscade', text: '+50% de dégâts contre un ennemi encore intact.' },
    lore: 'Chasseuse de primes qui n\'abandonne jamais une piste.',
  },
  {
    id: 'nix',
    name: 'Nix la Rapide',
    short: 'Nix',
    role: 'dps', rarity: 'rare', row: 'back',
    hp: 90, atk: 40, spd: 26,
    ability: { id: 'first_strike', name: 'Fulgurance', text: 'Joue toujours en premier.' },
    lore: 'Le temps qu\'on la voie, c\'est déjà fini.',
  },
  {
    id: 'kael',
    name: 'Kael le Duelliste',
    short: 'Kael',
    role: 'dps', rarity: 'common', row: 'front',
    hp: 130, atk: 28, spd: 11,
    ability: { id: 'riposte', name: 'Riposte', text: 'Gagne +4 ATK à chaque ennemi tué.' },
    lore: 'Il apprend de chaque duel. Surtout de ceux qu\'il gagne.',
  },

  // ---- Soin & soutien ----
  {
    id: 'finn',
    name: 'Frère Finn',
    short: 'Finn',
    role: 'heal', rarity: 'rare', row: 'back',
    hp: 120, atk: 16, spd: 10,
    ability: { id: 'heal_one', name: 'Lumière', text: 'Soigne l\'allié le plus blessé de 50 PV.' },
    lore: 'Prêtre vagabond dont la foi vacille mais les soins restent sûrs.',
  },
  {
    id: 'sora',
    name: 'Sora la Veilleuse',
    short: 'Sora',
    role: 'heal', rarity: 'epic', row: 'back',
    hp: 110, atk: 18, spd: 12,
    ability: { id: 'heal_all', name: 'Aube', text: 'Soigne toute l\'équipe de 20 PV.' },
    lore: 'Elle veille pendant que les autres dorment.',
  },
  {
    id: 'lyra',
    name: 'Lyra la Tisseuse',
    short: 'Lyra',
    role: 'support', rarity: 'rare', row: 'back',
    hp: 95, atk: 28, spd: 14,
    ability: { id: 'weaken', name: 'Entrave', text: 'Réduit de moitié l\'ATK de l\'ennemi le plus fort.' },
    lore: 'Fée demi-sang qui tisse la magie comme d\'autres tissent la soie.',
  },
  {
    id: 'ourg',
    name: 'Ourg le Buté',
    short: 'Ourg',
    role: 'tank', rarity: 'common', row: 'front',
    hp: 160, atk: 16, spd: 6,
    ability: { id: 'parry', name: 'Parade', text: 'Ignore la première attaque qu\'il reçoit.' },
    lore: 'On lui a dit de tenir la porte. Il tient la porte.',
  },
  {
    id: 'ysolde',
    name: 'Dame Ysolde',
    short: 'Ysolde',
    role: 'tank', rarity: 'epic', row: 'front',
    hp: 185, atk: 24, spd: 9,
    ability: { id: 'regen', name: 'Second Souffle', text: 'Récupère 10 PV chaque fois qu\'elle est frappée.' },
    lore: 'Chaque coup reçu lui rappelle pourquoi elle est là.',
  },
  {
    id: 'corvus',
    name: 'Corvus le Rôdeur',
    short: 'Corvus',
    role: 'dps', rarity: 'rare', row: 'back',
    hp: 100, atk: 32, spd: 18,
    ability: { id: 'snipe', name: 'Tir de Précision', text: 'Attaque l\'ennemi qui frappe le plus fort.' },
    lore: 'Il ne tire qu\'une fois, et jamais sur le plus proche.',
  },
  {
    id: 'ignis',
    name: 'Ignis le Pyromane',
    short: 'Ignis',
    role: 'dps', rarity: 'epic', row: 'back',
    hp: 95, atk: 34, spd: 11,
    ability: { id: 'splash', name: 'Déflagration', text: 'Frappe sa cible et les ennemis voisins.' },
    lore: 'Il n\'a jamais compris le concept de dégâts collatéraux.',
  },
  {
    id: 'aubepine',
    name: 'Mère Aubépine',
    short: 'Aubépine',
    role: 'heal', rarity: 'legendary', row: 'back',
    hp: 125, atk: 14, spd: 9,
    ability: { id: 'revive', name: 'Rappel', text: 'Relève un allié tombé, une fois par combat.' },
    lore: 'Elle discute avec la mort. Souvent, elle gagne.',
  },
  {
    id: 'orin',
    name: 'Orin le Barde',
    short: 'Orin',
    role: 'support', rarity: 'rare', row: 'back',
    hp: 105, atk: 22, spd: 15,
    ability: { id: 'rally', name: 'Refrain', text: 'L\'équipe gagne +15% ATK tant qu\'il est vivant.' },
    lore: 'Sa musique est médiocre. Ses effets sont indiscutables.',
  },
  {
    id: 'sibylle',
    name: 'Sibylle la Voyante',
    short: 'Sibylle',
    role: 'support', rarity: 'epic', row: 'back',
    hp: 100, atk: 24, spd: 17,
    ability: { id: 'slow', name: 'Présage', text: 'Réduit la VIT de tous les ennemis de 25%.' },
    lore: 'Elle sait déjà comment le combat finit. Elle aide un peu.',
  },
];

// Héros disponibles dès la première partie. Trois seulement, pour une équipe de
// quatre : le joueur ressent tout de suite le manque et va vouloir en débloquer.
export const STARTER_HERO_IDS = ['aldric', 'sylva', 'finn'];

export function getHeroById(id: string): HeroDefinition | undefined {
  return HERO_POOL.find(h => h.id === id);
}

export function getHeroesByRarity(rarity: Rarity): HeroDefinition[] {
  return HERO_POOL.filter(h => h.rarity === rarity);
}
