import { STATION_CATALOGUE } from './gameData.js';

export const CONFIG = {
  secondsPerGameDay: 60,
  baseAcclimatisationDays: 7,
  missionSearchTarget: 10,
  saveKey: 'jess_dog_army_save_v3',
  gridColumns: 10,
  gridRows: 7,
  maxStationOutputSlots: 10,
  longPressMs: 550,
};

export let gameState = createDefaultState();

export function createDefaultState() {
  const stations = {};

  for (const station of Object.values(STATION_CATALOGUE)) {
    const startsUnlocked = ['chickenCoop', 'dogFoodMachine', 'missionBoard'].includes(station.id);
    stations[station.id] = {
      id: station.id,
      name: station.name,
      unlocked: startsUnlocked,
      assignedDogIds: [],
      position: { ...station.defaultPosition },
      activeAction: null,
      actionQueue: [],
      pendingProducts: [],
      automationProgress: 0,
    };
  }

  return {
    version: 3,
    day: 1,
    level: 1,
    elapsedDaySeconds: 0,
    selectedStationId: null,
    editModeStationId: null,
    activeMission: null,
    resources: {
      protein: 0,
      foodBowls: 0,
      waterBowls: 0,
      blankets: 0,
    },
    dogs: [],
    stations,
    stats: {
      totalDogsRescued: 0,
      totalMissionsCompleted: 0,
      nextDogNumber: 1,
      nextProductId: 1,
    },
    log: ['Day 1: Jess opened the sandy rescue-centre plot.'],
  };
}

export function replaceGameState(nextState) {
  gameState = nextState;
}

export function addLog(message) {
  gameState.log.unshift(`Day ${gameState.day}: ${message}`);
  gameState.log = gameState.log.slice(0, 30);
}

export function selectStation(stationId) {
  gameState.selectedStationId = stationId;
}

export function closeStationPopup() {
  gameState.selectedStationId = null;
}

export function enterEditMode(stationId) {
  gameState.editModeStationId = stationId;
  gameState.selectedStationId = null;
}

export function exitEditMode() {
  gameState.editModeStationId = null;
}
