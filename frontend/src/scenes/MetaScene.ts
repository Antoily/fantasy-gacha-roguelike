import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config';
import { makeButton, makeTitle, fadeIn, transitionTo } from '../ui/UIManager';
import { TALENT_TREE } from '../data/talents';
import type { TalentNode, TalentTrack } from '../data/talents';
import { saveProgress } from './MainMenuScene';

const TRACK_COLORS: Record<TalentTrack, number> = {
  survival: 0x44dd88,
  power: 0xff6644,
  fortune: 0xffd700,
};

const TRACK_LABELS: Record<TalentTrack, string> = {
  survival: '🛡 Survie',
  power: '⚔ Puissance',
  fortune: '💰 Fortune',
};

export class MetaScene extends Phaser.Scene {
  constructor() { super('Meta'); }

  create(data?: { noFade?: boolean }): void {
    const gs = window.gameState;
    const tree = gs.talentTree;

    // Pas de fondu lors d'un restart (déblocage de talent) pour éviter un flash noir
    if (!data?.noFade) fadeIn(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    makeTitle(this, GAME_WIDTH / 2, 32, 'ARBRE DE TALENTS');
    this.add.text(GAME_WIDTH / 2, 58, `Points disponibles : ${tree.availablePoints}`, { ...FONTS.gold, align: 'center' }).setOrigin(0.5);

    const tracks: TalentTrack[] = ['survival', 'power', 'fortune'];
    const trackW = 110;
    const startX = GAME_WIDTH / 2 - trackW - 6;

    tracks.forEach((track, ti) => {
      const x = startX + ti * (trackW + 6);
      const nodes = TALENT_TREE.filter(n => n.track === track).sort((a, b) => a.tier - b.tier);

      this.add.text(x + trackW / 2, 82, TRACK_LABELS[track], {
        ...FONTS.small, align: 'center', color: `#${TRACK_COLORS[track].toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);

      nodes.forEach((node, ni) => {
        const nodeY = 112 + ni * 130;
        this.drawNode(node, x, nodeY, trackW);
      });
    });

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 44, '← RETOUR', () => transitionTo(this, 'MainMenu'), 200, 44, 0x444455);
  }

  private drawNode(node: TalentNode, x: number, y: number, w: number): void {
    const gs = window.gameState;
    const tree = gs.talentTree;
    const unlocked = tree.unlockedIds.includes(node.id);
    const canUnlock = tree.canUnlock(node.id);
    const trackColor = TRACK_COLORS[node.track];

    const border = unlocked ? trackColor : (canUnlock ? 0x666688 : 0x333344);
    const fill = unlocked ? 0x1a2a1a : (canUnlock ? 0x1a1a2a : 0x111122);

    const bg = this.add.rectangle(x + w / 2, y + 50, w - 4, 112, fill, 0.95).setStrokeStyle(unlocked ? 2 : 1, border);
    this.add.text(x + w / 2, y + 12, node.name, {
      ...FONTS.small, fontSize: '10px', align: 'center', wordWrap: { width: w - 12 },
      color: unlocked ? '#ffffff' : (canUnlock ? '#9999bb' : '#555566'),
    }).setOrigin(0.5);
    this.add.text(x + w / 2, y + 50, node.description, {
      fontSize: '8px', color: '#888899', fontFamily: 'Arial', align: 'center', wordWrap: { width: w - 12 },
    }).setOrigin(0.5);

    if (unlocked) {
      this.add.text(x + w / 2, y + 88, '✓ Débloqué', { fontSize: '9px', color: '#44dd88', fontFamily: 'Arial' }).setOrigin(0.5);
    } else {
      const costColor = canUnlock ? '#ffd700' : '#555555';
      this.add.text(x + w / 2, y + 88, `${node.cost} pts`, { fontSize: '9px', color: costColor, fontFamily: 'Arial' }).setOrigin(0.5);

      if (canUnlock) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
          if (tree.unlock(node.id)) {
            saveProgress();
            // Flash de déblocage avant le rafraîchissement de l'arbre
            const flash = this.add.rectangle(bg.x, bg.y, bg.width, bg.height, trackColor, 0.6);
            this.tweens.add({
              targets: flash,
              scaleX: 1.15, scaleY: 1.15,
              fillAlpha: 0,
              duration: 250,
              onComplete: () => this.scene.restart({ noFade: true }),
            });
          }
        });
        bg.on('pointerover', () => bg.setFillStyle(0x2a2a4a));
        bg.on('pointerout', () => bg.setFillStyle(fill));
      }
    }
  }
}
