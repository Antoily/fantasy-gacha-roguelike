import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GachaScene } from './scenes/GachaScene';
import { R } from './ui/display';
import { HEIGHT, WIDTH } from './ui/layout';
import { COLORS, CSS } from './ui/theme';

document.body.style.background = CSS.letterbox;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // Rendu à la densité de l'écran (ADR 0007) : la géométrie du jeu reste en 360 × 640.
  width: WIDTH * R,
  height: HEIGHT * R,
  backgroundColor: COLORS.background,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, GachaScene],
});
