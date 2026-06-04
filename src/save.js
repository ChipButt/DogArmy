import { CONFIG, createDefaultState, gameState, replaceGameState } from './state.js';

export function saveGame() {
  localStorage.setItem(CONFIG.saveKey, JSON.stringify(gameState));
}

export function loadGame() {
  const fresh = createDefaultState();
  const raw = localStorage.getItem(CONFIG.saveKey);
  if (!raw) return fresh;

  try {
    const saved = JSON.parse(raw);
    return mergeState(fresh, saved);
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

function mergeState(fresh, saved) {
  const mergedStations = { ...fresh.stations };

  for (const [id, station] of Object.entries(fresh.stations)) {
    const savedStation = saved.stations?.[id] || {};
    mergedStations[id] = {
      ...station,
      ...savedStation,
      position: savedStation.position || station.position,
      assignedDogIds: Array.isArray(savedStation.assignedDogIds) ? savedStation.assignedDogIds : [],
      pendingProducts: Array.isArray(savedStation.pendingProducts) ? savedStation.pendingProducts : [],
      actionQueue: Array.isArray(savedStation.actionQueue) ? savedStation.actionQueue : [],
      activeAction: savedStation.activeAction || null,
      automationProgress: Number(savedStation.automationProgress || 0),
    };
  }

  return {
    ...fresh,
    ...saved,
    resources: { ...fresh.resources, ...(saved.resources || {}) },
    stations: mergedStations,
    dogs: Array.isArray(saved.dogs) ? saved.dogs : [],
    stats: { ...fresh.stats, ...(saved.stats || {}) },
    log: Array.isArray(saved.log) ? saved.log : fresh.log,
    selectedStationId: null,
    editModeStationId: null,
    activeMission: saved.activeMission || null,
  };
}
