import { useEffect } from 'react';
import { initializeGame } from '../phaser/phaserGame';

const PhaserGame = () => {
  useEffect(() => {
    initializeGame();
  }, []);

  return <div id="phaser-container" />;
};

export default PhaserGame;
