import Phaser from 'phaser';
import { GameScene } from './GameScene';

export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#222222',
  parent: 'phaser-container',
  scene: [GameScene],
};

let game: Phaser.Game | null = null;

export const initializeGame = () => {
  if (!game) {
    game = new Phaser.Game(config);
  }
};
