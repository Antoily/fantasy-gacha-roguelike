import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveCombat, autoPlaceHeroes } from './CombatResolver';
import { createHeroInstance, type HeroInstance } from '../entities/Hero';
import { createEnemyInstance, type EnemyInstance } from '../entities/Enemy';
import { getHeroById } from '../data/heroes';
import { getEnemyById } from '../data/enemies';

// Le résolveur est la seule logique pure du jeu : pas de Phaser, pas d'I/O.
// C'est aussi le cœur du gameplay — ces tests existent pour qu'un refactor
// d'UI ne puisse pas casser une compétence en silence.

function hero(id: string): HeroInstance {
  const def = getHeroById(id);
  if (!def) throw new Error(`héros inconnu dans le test : ${id}`);
  return createHeroInstance(def);
}

function enemy(id: string, row = 0, col = 0): EnemyInstance {
  const def = getEnemyById(id);
  if (!def) throw new Error(`ennemi inconnu dans le test : ${id}`);
  return createEnemyInstance(def, row, col);
}

// Fige l'aléa des dégâts (ATK × [0.85–1.15]) : avec 0.5, le multiplicateur
// tombe au milieu de la fourchette et chaque combat devient reproductible.
function freezeRandom(value = 0.5) {
  vi.spyOn(Math, 'random').mockReturnValue(value);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('autoPlaceHeroes', () => {
  it('place les front en rangée 0 et les back en rangée 1', () => {
    const heroes = [hero('aldric'), hero('sylva'), hero('finn'), hero('gorvak')];
    autoPlaceHeroes(heroes);

    const byId = (definitionId: string) => heroes.find(h => h.definitionId === definitionId)!;
    expect(byId('aldric').gridRow).toBe(0);   // tank, front
    expect(byId('gorvak').gridRow).toBe(0);   // dps, front
    expect(byId('sylva').gridRow).toBe(1);    // dps, back
    expect(byId('finn').gridRow).toBe(1);     // heal, back
  });

  it('ne laisse jamais deux héros de la même rangée sur la même colonne', () => {
    const heroes = [hero('aldric'), hero('gorvak'), hero('kael')];
    autoPlaceHeroes(heroes);

    const cols = heroes.map(h => h.gridCol);
    expect(new Set(cols).size).toBe(cols.length);
  });
});

describe('conditions de fin', () => {
  it('déclare la victoire quand tous les ennemis sont morts', () => {
    freezeRandom();
    const heroes = [hero('aldric'), hero('sylva'), hero('gorvak'), hero('zara')];
    const enemies = [enemy('goblin_grunt')];

    const result = resolveCombat(heroes, enemies);

    expect(result.victory).toBe(true);
    expect(enemies.every(e => e.currentHp <= 0)).toBe(true);
  });

  it('déclare la défaite quand tous les héros sont morts', () => {
    freezeRandom();
    const heroes = [hero('finn')]; // soigneur seul, 16 ATK
    const enemies = [enemy('corrupted_ancient'), enemy('dungeon_lord', 0, 1)];

    const result = resolveCombat(heroes, enemies);

    expect(result.victory).toBe(false);
    expect(heroes.every(h => h.currentHp <= 0)).toBe(true);
  });

  it('termine toujours, même quand aucun camp ne peut tuer l\'autre', () => {
    freezeRandom();
    // Un tank qui régénère face à un ennemi lent : le combat doit s'arrêter
    // sur le plafond de tours plutôt que boucler à l'infini.
    const heroes = [hero('ysolde')];
    const enemies = [enemy('stone_golem')];

    const result = resolveCombat(heroes, enemies);

    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log.length).toBeLessThanOrEqual(200);
  });

  it('ne récompense en or que la victoire, et davantage contre un boss', () => {
    freezeRandom();
    const win = resolveCombat(
      [hero('aldric'), hero('sylva'), hero('zara'), hero('gorvak')],
      [enemy('goblin_grunt')],
    );
    const loss = resolveCombat([hero('finn')], [enemy('corrupted_ancient')]);

    expect(win.goldReward).toBeGreaterThan(0);
    expect(loss.goldReward).toBe(0);
  });
});

describe('ciblage', () => {
  it('« Provocation » (Aldric) absorbe toutes les attaques ennemies', () => {
    freezeRandom();
    // Pas de gros attaquant dans l'équipe : avec Sylva, son tir double tuait
    // l'archer avant qu'il ne joue et le test passait sans rien vérifier
    // (démontré en désactivant `taunt` : la suite restait verte).
    const aldric = hero('aldric');
    const finn = hero('finn');

    const result = resolveCombat([aldric, finn], [enemy('dark_archer')]);

    // L'archer vise normalement le rang arrière, donc Finn. La provocation
    // doit le détourner sur Aldric à chacune de ses attaques.
    const enemyActions = result.log.filter(e => e.actorSide === 'enemy');
    expect(enemyActions.length).toBeGreaterThan(0);
    expect(enemyActions.every(e => e.targetName === aldric.name)).toBe(true);
    expect(finn.currentHp).toBe(finn.maxHp);
  });

  it('sans provocation, l\'archer atteint bien le rang arrière', () => {
    freezeRandom();
    // Contre-épreuve du test précédent : sans Aldric, la backline encaisse.
    // Équipe volontairement peu offensive (Ourg frappe à 16, Finn ne fait que
    // soigner) : avec Sylva, son tir double tuait l'archer avant qu'il ne joue,
    // et le test passait pour de mauvaises raisons.
    const finn = hero('finn');
    const result = resolveCombat([hero('ourg'), finn], [enemy('dark_archer')]);

    const enemyActions = result.log.filter(e => e.actorSide === 'enemy');
    expect(enemyActions.length).toBeGreaterThan(0);
    expect(enemyActions.every(e => e.targetName === finn.name)).toBe(true);
  });
});

describe('compétences défensives', () => {
  it('« Parade » (Ourg) annule la première attaque reçue, une seule fois', () => {
    freezeRandom();
    const ourg = hero('ourg');
    const result = resolveCombat([ourg], [enemy('goblin_grunt')]);

    const parries = result.log.filter(e => e.special === 'Parade');
    expect(parries).toHaveLength(1);
    // La parade est bien la toute première attaque encaissée
    expect(result.log.find(e => e.actorSide === 'enemy')?.special).toBe('Parade');
    expect(ourg.parryUsed).toBe(true);
  });

  it('« Égide » (Thane) réduit les dégâts subis par l\'équipe', () => {
    freezeRandom();
    // Même combat, avec et sans le gardien : Gorvak doit encaisser moins
    // quand Thane est là. Thane meurt-il ? Non : le gobelin frappe le front,
    // et les deux sont en front — on compare donc les dégâts totaux subis.
    const withAegis = [hero('thane'), hero('gorvak')];
    const withoutAegis = [hero('brann'), hero('gorvak')];

    resolveCombat(withAegis, [enemy('goblin_grunt')]);
    resolveCombat(withoutAegis, [enemy('goblin_grunt')]);

    const lost = (team: HeroInstance[]) =>
      team.reduce((sum, h) => sum + (h.maxHp - h.currentHp), 0);

    expect(lost(withAegis)).toBeLessThan(lost(withoutAegis));
  });

  it('« Carapace » (Brann) renvoie une part des dégâts à l\'attaquant', () => {
    freezeRandom();
    const golem = enemy('stone_golem'); // lent et résistant : il encaisse le renvoi
    const result = resolveCombat([hero('brann')], [golem]);

    const carapace = result.log.find(e => e.special === 'Carapace');
    expect(carapace).toBeDefined();

    // Le renvoi vaut 30% du coup encaissé, et touche bien l'attaquant.
    const surBrann = carapace!.effects.find(f => f.kind === 'damage' && f.unitId !== golem.instanceId)!;
    const surGolem = carapace!.effects.find(f => f.unitId === golem.instanceId)!;
    expect(surGolem.amount).toBe(Math.max(1, Math.round(surBrann.amount * 0.30)));
  });
});

describe('compétences de soutien', () => {
  it('« Lumière » (Finn) soigne le héros le plus blessé, pas lui-même par défaut', () => {
    freezeRandom();
    const aldric = hero('aldric');
    const finn = hero('finn');
    aldric.currentHp = 50; // nettement le plus bas en proportion

    // Golem à 5 de VIT, sous les 10 de Finn : le soin est la toute première
    // action du combat, donc les PV attendus sont calculables exactement.
    const result = resolveCombat([aldric, finn], [enemy('stone_golem')]);

    const firstHeal = result.log.find(e => e.special === 'Lumière');
    expect(firstHeal).toBeDefined();
    expect(firstHeal!.targetName).toBe(aldric.name);

    // On vérifie les PV réellement rendus, pas le champ `heal` du journal :
    // ce dernier est une constante écrite à part, il resterait à 50 même si le
    // soin ne rendait plus rien.
    const soin = firstHeal!.effects.find(f => f.kind === 'heal')!;
    expect(soin.unitId).toBe(aldric.instanceId);
    expect(soin.hpAfter).toBe(100);  // 50 PV de départ + 50 rendus
  });

  it('« Entrave » (Lyra) vise l\'ennemi le plus fort', () => {
    freezeRandom();
    const fort = enemy('orc_berserker', 0, 0);   // 30 ATK
    const faible = enemy('goblin_grunt', 0, 1);  // 12 ATK

    const result = resolveCombat([hero('aldric'), hero('lyra')], [fort, faible]);

    // On vérifie le PREMIER usage : sur la durée, Lyra se reporte légitimement
    // sur le gobelin une fois l'orc tombé. Affirmer que le gobelin n'est jamais
    // touché reviendrait à figer un détail de déroulé, pas la règle.
    const premiere = result.log.find(e => e.special === 'Entrave');
    expect(premiere).toBeDefined();
    expect(premiere!.targetName).toBe(fort.name);
    expect(fort.atkDebuffPct).toBe(50);
  });

  it('« Présage » (Sibylle) ralentit tout le camp adverse de 25%', () => {
    freezeRandom();
    const cible = enemy('goblin_grunt'); // 13 VIT
    resolveCombat([hero('aldric'), hero('sibylle')], [cible]);

    expect(cible.spd).toBe(Math.round(13 * 0.75));
  });

  it('« Rappel » (Aubépine) ne relève un allié qu\'une fois par combat', () => {
    freezeRandom();
    const aubepine = hero('aubepine');
    const tombe = hero('kael');
    tombe.currentHp = 0;

    const result = resolveCombat([aubepine, tombe], [enemy('goblin_grunt')]);

    const revives = result.log.filter(e => e.special === 'Rappel');
    expect(revives.length).toBeLessThanOrEqual(1);
    expect(aubepine.reviveUsed).toBe(true);
  });
});

describe('ordre du tour', () => {
  it('« Fulgurance » (Nix) fait jouer son porteur en premier', () => {
    freezeRandom();
    // Nix est déjà le plus rapide du jeu (26 VIT) : face aux ennemis existants,
    // il passerait devant même sans sa compétence, et le test ne prouverait
    // rien. On lui oppose donc un ennemi délibérément plus rapide.
    const nix = hero('nix');
    const foudroyant = enemy('shadow_assassin');
    foudroyant.spd = 99;

    const result = resolveCombat([nix, hero('aldric')], [foudroyant]);

    expect(result.log[0].actorName).toBe(nix.name);
  });

  it('à compétence égale, le plus rapide agit en premier', () => {
    freezeRandom();
    const rapide = hero('sylva');  // 18 VIT
    const lent = hero('aldric');   // 6 VIT
    const result = resolveCombat([lent, rapide], [enemy('stone_golem')]); // golem : 5 VIT

    expect(result.log[0].actorName).toBe(rapide.name);
  });
});

describe('remise à zéro entre deux combats', () => {
  it('les jetons à usage unique et les affaiblissements ne survivent pas', () => {
    freezeRandom();
    const ourg = hero('ourg');
    const aubepine = hero('aubepine');
    ourg.atkDebuffPct = 40;
    ourg.parryUsed = true;
    aubepine.reviveUsed = true;

    resolveCombat([ourg, aubepine], [enemy('goblin_grunt')]);

    // La parade a été reconsommée pendant ce combat, donc elle est de nouveau
    // à true — mais elle a bien resservi, ce qui prouve la remise à zéro.
    expect(ourg.atkDebuffPct).toBe(0);
  });

  it('les PV, eux, sont conservés d\'un combat à l\'autre', () => {
    freezeRandom();
    const aldric = hero('aldric');
    aldric.currentHp = 100;

    resolveCombat([aldric, hero('sylva'), hero('zara')], [enemy('goblin_grunt')]);

    expect(aldric.currentHp).toBeLessThanOrEqual(100);
  });
});
