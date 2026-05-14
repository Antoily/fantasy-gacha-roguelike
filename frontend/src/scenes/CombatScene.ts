import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makePanel, makeTitle, makeHpBar } from '../ui/UIManager';
import { resolveCombat, type CombatLogEntry } from '../systems/CombatResolver';
import { createEnemyInstance } from '../entities/Enemy';
import { isHeroAlive } from '../entities/Hero';
import { getEnemyById } from '../data/enemies';

export class CombatScene extends Phaser.Scene {
  private log: CombatLogEntry[] = [];
  private logText!: Phaser.GameObjects.Text;

  constructor() { super('Combat'); }

  create(): void {
    const gs = window.gameState;
    const run = gs.runManager.state;
    const room = run.rooms[run.currentRoomIndex];

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, `bg_${room.isBossRoom ? 'boss' : 'combat'}`).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.3);

    if (!room.formation) {
      this.scene.start('RunMap');
      return;
    }

    // Build enemies from formation
    const enemies = room.formation.grid.flatMap((rowArr, r) =>
      rowArr.map((eid, c) => {
        if (!eid) return null;
        const def = getEnemyById(eid);
        if (!def) return null;
        return createEnemyInstance(def, r, c);
      }).filter((e): e is NonNullable<typeof e> => e !== null)
    );

    // Resolve combat
    const result = resolveCombat(
      run.heroes,
      enemies,
      run.relics,
      gs.runManager.getGoldMultiplier(),
      run.runReviveUsed,
    );

    this.log = result.log;
    this.drawHeader(room.formation.name, room.isBossRoom);
    this.drawGrids(run.heroes.filter(isHeroAlive));
    this.drawLogPanel();
    this.drawResult(result.victory, result.goldReward);
  }

  private drawHeader(formationName: string, isBoss: boolean): void {
    makeTitle(this, GAME_WIDTH / 2, 22, isBoss ? `⚔ BOSS — ${formationName}` : `⚔ COMBAT — ${formationName}`);
  }

  private drawGrids(heroes: import('../entities/Hero').HeroInstance[]): void {
    this.add.text(70, 55, 'Votre équipe', { ...FONTS.small, color: '#7777ff', align: 'center' }).setOrigin(0.5);
    heroes.forEach(h => {
      if (h.gridRow === null) return;
      const x = 15 + (h.gridCol ?? 0) * 42;
      const y = 70 + (h.gridRow ?? 0) * 50;
      this.add.rectangle(x + 16, y + 20, 38, 44, 0x1e2a3a).setStrokeStyle(1, COLORS.accentLight);
      this.add.image(x + 16, y + 14, `hero_${h.definitionId}`).setDisplaySize(32, 32);
      this.add.text(x + 16, y + 32, h.name.split(' ')[0], { fontSize: '7px', color: '#ffffff' }).setOrigin(0.5);
      makeHpBar(this, x + 16, y + 42, 36, 4, h.currentHp / h.maxHp);
    });
  }

  private drawLogPanel(): void {
    makePanel(this, GAME_WIDTH / 2, 310, 340, 150);
    this.add.text(GAME_WIDTH / 2, 244, 'Journal de combat', { ...FONTS.small, align: 'center' }).setOrigin(0.5);
    this.logText = this.add.text(20, 256, '', {
      ...FONTS.small,
      fontSize: '11px',
      wordWrap: { width: 320 },
      lineSpacing: 2,
    });
    this.showLogEntries();
  }

  private showLogEntries(): void {
    const entries = this.log.slice(0, 18).map(e => {
      if (e.heal > 0) return `${e.actorName} soigne ${e.targetName} (+${e.heal} PV)${e.special ? ` [${e.special}]` : ''}`;
      if (e.damage > 0) return `${e.actorName} → ${e.targetName} : ${e.damage} dégâts${e.special ? ` [${e.special}]` : ''}`;
      return `${e.actorName} : ${e.special}`;
    });
    this.logText.setText(entries.join('\n'));
  }

  private drawResult(victory: boolean, goldEarned: number): void {
    const gs = window.gameState;
    const resultY = 400;

    if (victory) {
      this.add.text(GAME_WIDTH / 2, resultY, '✨ VICTOIRE', {
        fontFamily: 'Georgia, serif', fontSize: '28px', color: '#ffd700', align: 'center',
      }).setOrigin(0.5);
      this.add.text(GAME_WIDTH / 2, resultY + 35, `+${goldEarned} 💰`, { ...FONTS.gold, align: 'center' }).setOrigin(0.5);

      makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 55, 'CONTINUER ▶', () => {
        gs.runManager.completeRoom({ gold: goldEarned });
        if (gs.runManager.state.isOver) {
          this.scene.start('GameOver');
        } else if (gs.runManager.heroesAllDead()) {
          gs.runManager.endRun(false);
          this.scene.start('GameOver');
        } else {
          this.scene.start('RunMap');
        }
      }, 240, 46);
    } else {
      this.add.text(GAME_WIDTH / 2, resultY, '💀 DÉFAITE', {
        fontFamily: 'Georgia, serif', fontSize: '28px', color: '#cc3333', align: 'center',
      }).setOrigin(0.5);
      this.add.text(GAME_WIDTH / 2, resultY + 35, 'Vos héros sont tombés.', { ...FONTS.small, align: 'center' }).setOrigin(0.5);

      makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 55, 'FIN DU RUN', () => {
        gs.runManager.endRun(false);
        this.scene.start('GameOver');
      }, 240, 46, 0x881122);
    }
  }
}
