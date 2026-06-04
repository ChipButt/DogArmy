import { CONFIG } from './config.js';
import { createDefaultState, gameState, replaceGameState } from './state.js';

export function saveGame() {
  localStorage.setItem(CONFIG.saveKey, JSON.stringify(gameState));
}

export function loadGame() {
  const fresh = createDefaultState();
  const raw = localStorage.getItem(CONFIG.saveKey);

  if (!raw) return fresh;

  try {
    const saved = JSON.parse(raw);
    return {
      ...fresh,
      ...saved,
      resources: { ...fresh.resources, ...(saved.resources || {}) },
      unlocked: { ...fresh.unlocked, ...(saved.unlocked || {}) },
      stations: mergeStations(fresh.stations, saved.stations || {}),
      stats: { ...fresh.stats, ...(saved.stats || {}) },
      dogs: Array.isArray(saved.dogs) ? saved.dogs : [],
      log: Array.isArray(saved.log) ? saved.log : fresh.log,
    };
  } catch (error) {
    console.warn('Save failed to load. Starting fresh.', error);
    return fresh;
  }
}

export function resetGame() {
  localStorage.removeItem(CONFIG.saveKey);
  replaceGameState(createDefaultState());
  saveGame();
}

function mergeStations(base, saved) {
  const merged = {};

  for (const [id, station] of Object.entries(base)) {
    merged[id] = {
      ...station,
      ...(saved[id] || {}),
      assignedDogIds: Array.isArray(saved[id]?.assignedDogIds) ? saved[id].assignedDogIds : [],
      automationProgress: Number(saved[id]?.automationProgress || 0),
    };
  }

  return merged;
}
