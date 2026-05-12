import type { RelicDefinition } from './relics';

export type EventOutcomeType =
  | 'gain_relic'
  | 'gain_gold'
  | 'heal_all'
  | 'lose_hp'
  | 'recruit_hero'
  | 'buff_hero'
  | 'nothing';

export interface EventChoice {
  id: string;
  label: string;
  outcomeType: EventOutcomeType;
  outcomeValue?: number;        // HP, gold, etc.
  outcomeRarity?: 'common' | 'rare'; // for relic reward
  description: string;         // shown after choice
}

export interface EventDefinition {
  id: string;
  title: string;
  description: string;
  flavourText: string;
  choices: EventChoice[];
}

export const EVENT_POOL: EventDefinition[] = [
  {
    id: 'cursed_fountain',
    title: 'Fontaine Maudite',
    description: 'Une fontaine d\'eau noire pulse d\'une énergie étrange.',
    flavourText: '"L\'eau murmure des promesses que tu ne seras peut-être pas prêt à tenir."',
    choices: [
      {
        id: 'drink',
        label: 'Boire l\'eau',
        outcomeType: 'gain_relic',
        outcomeRarity: 'rare',
        description: 'Les PV brûlent, mais une relique se matérialise dans ta paume.',
      },
      {
        id: 'pass',
        label: 'Ignorer',
        outcomeType: 'nothing',
        description: 'Tu continues ta route, prudent.',
      },
    ],
  },
  {
    id: 'lost_merchant',
    title: 'Marchand Égaré',
    description: 'Un marchand hirsute sort de l\'ombre avec un sourire douteux.',
    flavourText: '"Juste 30 pièces… pour quelque chose de très spécial."',
    choices: [
      {
        id: 'buy',
        label: 'Payer 30 or',
        outcomeType: 'gain_relic',
        outcomeRarity: 'common',
        outcomeValue: -30,
        description: 'Il disparaît en te laissant une relique et des questions.',
      },
      {
        id: 'ignore',
        label: 'Refuser',
        outcomeType: 'nothing',
        description: 'Il hausse les épaules et s\'évanouit dans les ténèbres.',
      },
    ],
  },
  {
    id: 'ancient_shrine',
    title: 'Sanctuaire Ancien',
    description: 'Un autel en pierre gravé de runes brille d\'une faible lumière dorée.',
    flavourText: '"Les dieux se souviennent de ceux qui s\'inclinent."',
    choices: [
      {
        id: 'pray',
        label: 'Prier',
        outcomeType: 'buff_hero',
        outcomeValue: 10,
        description: 'Un héros aléatoire reçoit +10 à une stat aléatoire.',
      },
      {
        id: 'pass',
        label: 'Passer son chemin',
        outcomeType: 'nothing',
        description: 'La lumière s\'estompe doucement.',
      },
    ],
  },
  {
    id: 'abandoned_camp',
    title: 'Camp Abandonné',
    description: 'Un campement désert avec encore du feu et des vivres.',
    flavourText: '"Quelqu\'un s\'est enfui précipitamment. Profites-en."',
    choices: [
      {
        id: 'rest',
        label: 'Se reposer',
        outcomeType: 'heal_all',
        outcomeValue: 25,
        description: 'Toute l\'équipe récupère 25 PV.',
      },
    ],
  },
  {
    id: 'dark_ritual',
    title: 'Rituel Noir',
    description: 'Un cercle de sang dessine des symboles qui promettent du pouvoir.',
    flavourText: '"La magie ancienne exige un sacrifice."',
    choices: [
      {
        id: 'sacrifice',
        label: 'Sacrifier 25 PV (héros choisi)',
        outcomeType: 'gain_relic',
        outcomeRarity: 'rare',
        outcomeValue: -25,
        description: 'La douleur disparaît. Une relique rare prend forme.',
      },
      {
        id: 'refuse',
        label: 'Refuser',
        outcomeType: 'nothing',
        description: 'Le cercle s\'efface. Certaines portes ne s\'ouvrent qu\'une fois.',
      },
    ],
  },
  {
    id: 'hidden_cache',
    title: 'Cache Secrète',
    description: 'Derrière une pierre descellée, une réserve de trésors oubliés.',
    flavourText: '"La fortune sourit aux curieux."',
    choices: [
      {
        id: 'take',
        label: 'Prendre le trésor',
        outcomeType: 'gain_gold',
        outcomeValue: 60,
        description: 'Tu empiles 60 pièces d\'or et une relique commune dans ton sac.',
      },
    ],
  },
  {
    id: 'wandering_soul',
    title: 'Âme Errante',
    description: 'Un spectre flotte dans la pièce, l\'air suppliant.',
    flavourText: '"Je cherche la paix… ou quelqu\'un à suivre."',
    choices: [
      {
        id: 'guide',
        label: 'Lui offrir la paix (perdre 20 or)',
        outcomeType: 'gain_gold',
        outcomeValue: -20,
        description: 'L\'âme disparaît en te laissant une bénédiction qui soigne 30 PV à tous.',
      },
      {
        id: 'ignore',
        label: 'L\'ignorer',
        outcomeType: 'nothing',
        description: 'Le spectre pousse un long gémissement.',
      },
    ],
  },
];

export function getRandomEvents(count: number): EventDefinition[] {
  const shuffled = [...EVENT_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Suppress unused import warning — RelicDefinition used by consumers
export type { RelicDefinition };
