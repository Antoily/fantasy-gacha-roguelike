export type EnemyPattern =
  | 'rush_front'       // charges front row
  | 'target_back'      // archers/mages aim back row
  | 'target_lowest_hp' // predator, hunts weakest
  | 'aoe_row'          // hits entire row
  | 'front_tank'       // reste devant, encaisse
  | 'cycle_attacks';   // boss rotates abilities

export interface EnemyDefinition {
  id: string;
  name: string;
  hp: number;
  atk: number;
  spd: number;
  pattern: EnemyPattern;
  isBoss: boolean;
  lore: string;
}

export const ENEMY_POOL: EnemyDefinition[] = [
  {
    id: 'goblin_grunt',
    name: 'Gobelin Soldat',
    hp: 55, atk: 12, spd: 13,
    pattern: 'rush_front',
    isBoss: false,
    lore: 'Petit, rapide, et mortel en meute.',
  },
  {
    id: 'orc_berserker',
    name: 'Berserker Orc',
    hp: 100, atk: 30, spd: 8,
    pattern: 'rush_front',
    isBoss: false,
    lore: 'La rage lui tient lieu de stratégie.',
  },
  {
    id: 'dark_archer',
    name: 'Archer des Ombres',
    hp: 50, atk: 20, spd: 15,
    pattern: 'target_back',
    isBoss: false,
    lore: 'Il vise toujours les mages et prêtres en premier.',
  },
  {
    id: 'skeleton_mage',
    name: 'Mage Squelette',
    hp: 60, atk: 24, spd: 11,
    pattern: 'aoe_row',
    isBoss: false,
    lore: 'Ses sortilèges balaient toute une rangée d\'alliés.',
  },
  {
    id: 'stone_golem',
    name: 'Golem de Pierre',
    hp: 230, atk: 24, spd: 5,
    pattern: 'front_tank',
    isBoss: false,
    lore: 'Presque indestructible. Presque.',
  },
  {
    id: 'shadow_assassin',
    name: 'Assassin des Ombres',
    hp: 70, atk: 40, spd: 24,
    pattern: 'target_lowest_hp',
    isBoss: false,
    lore: 'Il choisit sa proie avec soin.',
  },
  {
    id: 'cursed_knight',
    name: 'Chevalier Maudit',
    hp: 155, atk: 28, spd: 10,
    pattern: 'rush_front',
    isBoss: false,
    lore: 'Autrefois un héros. Désormais une lame au service des ténèbres.',
  },
  {
    id: 'forest_witch',
    name: 'Sorcière de la Forêt',
    hp: 85, atk: 30, spd: 12,
    pattern: 'aoe_row',
    isBoss: false,
    lore: 'Ses malédictions s\'étendent comme des racines.',
  },
  // Bosses
  {
    id: 'dungeon_lord',
    name: 'Seigneur du Donjon',
    hp: 430, atk: 36, spd: 10,
    pattern: 'cycle_attacks',
    isBoss: true,
    lore: 'Il gouverne ces profondeurs depuis des siècles.',
  },
  {
    id: 'corrupted_ancient',
    name: 'Ancien Corrompu',
    hp: 620, atk: 46, spd: 8,
    pattern: 'cycle_attacks',
    isBoss: true,
    lore: 'Ce qui fut jadis un gardien sacré est désormais une source de corruption.',
  },
];

export interface EnemyFormation {
  id: string;
  name: string;
  description: string;
  // 3x3 grid: [row][col], null = empty
  grid: (string | null)[][];
  hint: string;
}

export const ENEMY_FORMATIONS: EnemyFormation[] = [
  {
    id: 'spear_rush',
    name: 'Charge en Lance',
    description: 'Ennemis concentrés en rang avant',
    hint: 'Rang avant chargé — placer un tank solide face à eux.',
    grid: [
      ['orc_berserker', 'goblin_grunt', 'orc_berserker'],
      [null, null, null],
      [null, null, null],
    ],
  },
  {
    id: 'arrow_rain',
    name: 'Pluie de Flèches',
    description: 'Archers et mages protégés en arrière',
    hint: 'Backline exposée si on force le passage — assassins idéaux.',
    grid: [
      ['goblin_grunt', null, 'goblin_grunt'],
      [null, null, null],
      ['dark_archer', 'skeleton_mage', 'dark_archer'],
    ],
  },
  {
    id: 'shield_wall',
    name: 'Mur de Boucliers',
    description: 'Ligne de brutes qui encaissent tout',
    hint: 'Beaucoup de PV en front. Un soigneur aide à tenir la durée.',
    grid: [
      ['stone_golem', 'cursed_knight', 'stone_golem'],
      [null, null, null],
      [null, null, null],
    ],
  },
  {
    id: 'spread_assault',
    name: 'Assaut Dispersé',
    description: 'Ennemis éparpillés sur toute la grille',
    hint: 'Cibles disséminées — la magie de zone excelle ici.',
    grid: [
      ['goblin_grunt', null, 'dark_archer'],
      [null, 'shadow_assassin', null],
      ['skeleton_mage', null, 'goblin_grunt'],
    ],
  },
  {
    id: 'death_squad',
    name: 'Escouade de la Mort',
    description: 'Unités d\'élite disposées stratégiquement',
    hint: 'Des assassins et une sorcière — protéger le backline propre.',
    grid: [
      ['cursed_knight', null, 'cursed_knight'],
      [null, 'shadow_assassin', null],
      [null, 'forest_witch', null],
    ],
  },
];

export function getEnemyById(id: string): EnemyDefinition | undefined {
  return ENEMY_POOL.find(e => e.id === id);
}
