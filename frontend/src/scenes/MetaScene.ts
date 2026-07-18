import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONTS, FONT_FAMILY, STROKE } from '../config';
import { makeButton, makeTitle, fadeIn, transitionTo } from '../ui/UIManager';
import { TALENT_TREE } from '../data/talents';
import type { TalentNode, TalentTrack } from '../data/talents';
import { saveProgress } from './MainMenuScene';

const TRACK_COLORS: Record<TalentTrack, number> = COLORS.track;

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
    const trackGap = 6;
    // Le groupe des 3 tracks est centré sur l'écran : l'ancien calcul centrait le
    // bord gauche de la track du milieu, ce qui faisait sortir « Fortune » de l'écran.
    const startX = GAME_WIDTH / 2 - (3 * trackW + 2 * trackGap) / 2;

    tracks.forEach((track, ti) => {
      const x = startX + ti * (trackW + trackGap);
      const nodes = TALENT_TREE.filter(n => n.track === track).sort((a, b) => a.tier - b.tier);

      this.add.text(x + trackW / 2, 82, TRACK_LABELS[track], {
        ...FONTS.small, align: 'center', color: `#${TRACK_COLORS[track].toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);

      nodes.forEach((node, ni) => {
        const nodeY = 112 + ni * 130;
        this.drawNode(node, x, nodeY, trackW);
      });
    });

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 44, '← RETOUR', () => transitionTo(this, 'MainMenu'), 200, 44, COLORS.btn.neutral);
  }

  private drawNode(node: TalentNode, x: number, y: number, w: number): void {
    const gs = window.gameState;
    const tree = gs.talentTree;
    const unlocked = tree.unlockedIds.includes(node.id);
    const canUnlock = tree.canUnlock(node.id);
    const trackColor = TRACK_COLORS[node.track];

    // Un nœud verrouillé se lit à son fond terne, pas à un contour pâle :
    // le trait reste noir partout pour garder le style BD.
    const border = unlocked ? trackColor : (canUnlock ? COLORS.ink : COLORS.textFaint);
    const fill = canUnlock || unlocked ? COLORS.panel : COLORS.backgroundAlt;

    const bg = this.add.rectangle(x + w / 2, y + 50, w - 4, 112, fill, 1).setStrokeStyle(unlocked ? STROKE.thick : STROKE.thin, border);
    this.add.text(x + w / 2, y + 12, node.name, {
      ...FONTS.small, fontSize: '10px', align: 'center', wordWrap: { width: w - 12 },
      color: canUnlock || unlocked ? CSS.text : CSS.textDim,
    }).setOrigin(0.5);
    this.add.text(x + w / 2, y + 50, node.description, {
      fontSize: '8px', color: CSS.textDim, fontFamily: FONT_FAMILY, fontStyle: 'bold', align: 'center', wordWrap: { width: w - 12 },
    }).setOrigin(0.5);

    if (unlocked) {
      this.add.text(x + w / 2, y + 88, '✓ Débloqué', { fontSize: '9px', color: CSS.hp, fontFamily: FONT_FAMILY, fontStyle: 'bold' }).setOrigin(0.5);
    } else {
      // L'or serait illisible sur le panneau blanc : l'accent porte le coût payable
      const costColor = canUnlock ? CSS.accent : CSS.textFaint;
      this.add.text(x + w / 2, y + 88, `${node.cost} pts`, { fontSize: '9px', color: costColor, fontFamily: FONT_FAMILY, fontStyle: 'bold' }).setOrigin(0.5);

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
        bg.on('pointerover', () => bg.setFillStyle(COLORS.backgroundAlt));
        bg.on('pointerout', () => bg.setFillStyle(fill));
      }
    }
  }
}
