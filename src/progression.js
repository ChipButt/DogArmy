import { gameState, addLog } from './state.js';

export function unlockStation(stationId) {
  const station = gameState.stations[stationId];
  if (!station || station.unlocked) return;

  station.unlocked = true;
  gameState.unlocked[stationId] = true;
  addLog(`${station.name} unlocked.`);
}

export function checkProgressionUnlocks() {
  const rescued = gameState.stats.totalDogsRescued;

  if (rescued >= 2) {
    gameState.level = Math.max(gameState.level, 2);
    unlockStation('waterPump');
  }

  if (rescued >= 3) {
    gameState.level = Math.max(gameState.level, 3);
    unlockStation('blanketStation');
  }

  if (rescued >= 4) {
    gameState.level = Math.max(gameState.level, 4);
  }

  if (rescued >= 5) {
    gameState.level = Math.max(gameState.level, 5);
    unlockStation('therapyYard');
  }

  if (rescued >= 6) {
    gameState.level = Math.max(gameState.level, 6);
  }
}
