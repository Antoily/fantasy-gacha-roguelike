import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GachaScene } from './scenes/GachaScene';
import { HEIGHT, WIDTH } from './ui/layout';
import { COLORS, CSS } from './ui/theme';

document.body.style.background = CSS.letterbox;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: COLORS.background,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, GachaScene],
});
