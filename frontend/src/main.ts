import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { RunMapScene } from './scenes/RunMapScene';
import { FormationScene } from './scenes/FormationScene';
import { CombatScene } from './scenes/CombatScene';
import { EventScene } from './scenes/EventScene';
import { ShopScene } from './scenes/ShopScene';
import { RestScene } from './scenes/RestScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GachaScene } from './scenes/GachaScene';
import { MetaScene } from './scenes/MetaScene';
import { CollectionScene } from './scenes/CollectionScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance',
  },
  disableContextMenu: true,
  scene: [
    BootScene,
    MainMenuScene,
    RunMapScene,
    FormationScene,
    CombatScene,
    EventScene,
    ShopScene,
    RestScene,
    GameOverScene,
    GachaScene,
    MetaScene,
    CollectionScene,
  ],
};

new Phaser.Game(config);
