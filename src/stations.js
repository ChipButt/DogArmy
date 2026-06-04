import { RESOURCE_LABELS } from './config.js';
import { gameState, addLog } from './state.js';
import { addResource, consumeResource } from './resources.js';

export function getAssignedDogCount(stationId) {
  return gameState.stations[stationId]?.assignedDogIds.length || 0;
}

export function getStationStatus(stationId) {
  const count = getAssignedDogCount(stationId);

  if (stationId === 'therapyYard') {
    return `${count} mentor dog${count === 1 ? '' : 's'}`;
  }

  return count > 0 ? `Automated: ${count}x output` : 'Manual only';
}

export function manualProduce(stationId) {
  const station = gameState.stations[stationId];
  if (!station || !station.unlocked || stationId === 'therapyYard') return;

  produceFromStation(stationId, 1, true);
}

export function autoProduce(stationId) {
  const count = getAssignedDogCount(stationId);
  if (count <= 0) return;

  produceFromStation(stationId, Math.max(1, count), false);
}

export function updateAutomation(deltaSeconds) {
  for (const station of Object.values(gameState.stations)) {
    if (!station.unlocked || station.id === 'therapyYard' || getAssignedDogCount(station.id) <= 0) continue;

    station.automationProgress += deltaSeconds;

    while (station.automationProgress >= station.baseIntervalSeconds) {
      station.automationProgress -= station.baseIntervalSeconds;
      autoProduce(station.id);
    }
  }
}

function produceFromStation(stationId, amountMultiplier, shouldLog) {
  const station = gameState.stations[stationId];

  if (station.inputResource) {
    const possibleAmount = Math.min(
      amountMultiplier,
      Math.floor((gameState.resources[station.inputResource] || 0) / station.inputAmount),
    );

    if (possibleAmount <= 0) {
      if (shouldLog) addLog(`${station.name} needs ${RESOURCE_LABELS[station.inputResource]}.`);
      return false;
    }

    consumeResource(station.inputResource, station.inputAmount * possibleAmount);
    addResource(station.outputResource, station.outputAmount * possibleAmount);

    if (shouldLog) {
      addLog(`${station.name} made ${station.outputAmount * possibleAmount} ${RESOURCE_LABELS[station.outputResource]}.`);
    }

    return true;
  }

  addResource(station.outputResource, station.outputAmount * amountMultiplier);

  if (shouldLog) {
    addLog(`${station.name} produced ${station.outputAmount * amountMultiplier} ${RESOURCE_LABELS[station.outputResource]}.`);
  }

  return true;
}
