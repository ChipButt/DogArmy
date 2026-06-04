import { CONFIG, RESOURCE_LABELS } from './config.js';
import { gameState, addLog } from './state.js';
import { consumeResources, hasRequiredResources } from './resources.js';
import { checkProgressionUnlocks } from './progression.js';

export function createDog() {
  const dogNumber = gameState.stats.nextDogNumber++;

  return {
    id: `dog_${String(dogNumber).padStart(3, '0')}`,
    name: `Dog ${dogNumber}`,
    state: 'acclimatising',
    rescuedDay: gameState.day,
    acclimatisationProgress: 0,
    assignedStationId: null,
  };
}

export function rescueDog(count = 1) {
  for (let index = 0; index < count; index += 1) {
    const dog = createDog();
    gameState.dogs.push(dog);
    gameState.stats.totalDogsRescued += 1;

    if (gameState.stats.totalDogsRescued === 1) {
      makeDogReady(dog.id, true);
      addLog(`${dog.name} was rescued and is ready straight away for the tutorial.`);
    } else {
      addLog(`${dog.name} was rescued and entered the kennels.`);
    }
  }

  checkProgressionUnlocks();
}

export function makeDogReady(dogId, silent = false) {
  const dog = gameState.dogs.find(item => item.id === dogId);
  if (!dog) return;

  dog.state = 'ready';
  dog.assignedStationId = null;

  if (!silent) {
    addLog(`${dog.name} finished acclimatising and joined the dog army.`);
  }
}

export function getDogsByState(state) {
  return gameState.dogs.filter(dog => dog.state === state);
}

export function getAvailableDogs() {
  return getDogsByState('ready');
}

export function getTherapyDogCount() {
  return gameState.stations.therapyYard.assignedDogIds.length;
}

export function getEffectiveAcclimatisationDays() {
  return Math.max(0, CONFIG.baseAcclimatisationDays - getTherapyDogCount());
}

export function getCurrentAcclimatisationRequirements() {
  const requirements = { foodBowls: 1 };

  if (gameState.unlocked.waterPump) requirements.waterBowls = 1;
  if (gameState.unlocked.blanketStation) requirements.blankets = 1;

  return requirements;
}

export function getCurrentRequirementLabels() {
  return Object.keys(getCurrentAcclimatisationRequirements())
    .map(resource => RESOURCE_LABELS[resource])
    .join(', ');
}

export function processAcclimatisation() {
  const requiredDays = getEffectiveAcclimatisationDays();

  for (const dog of gameState.dogs) {
    if (dog.state !== 'acclimatising') continue;

    if (requiredDays === 0) {
      makeDogReady(dog.id);
      continue;
    }

    const requirements = getCurrentAcclimatisationRequirements();

    if (hasRequiredResources(requirements)) {
      consumeResources(requirements);
      dog.acclimatisationProgress += 1;

      if (dog.acclimatisationProgress >= requiredDays) {
        makeDogReady(dog.id);
      } else {
        addLog(`${dog.name} settled in a little more: ${dog.acclimatisationProgress}/${requiredDays}.`);
      }
    } else {
      addLog(`${dog.name} could not progress today because supplies were missing.`);
    }
  }
}

export function assignDogToStation(dogId, stationId) {
  const dog = gameState.dogs.find(item => item.id === dogId);
  const station = gameState.stations[stationId];

  if (!dog || !station || !station.unlocked || dog.state === 'acclimatising') return false;

  removeDogFromStation(dogId, false);
  station.assignedDogIds.push(dogId);
  dog.assignedStationId = stationId;
  dog.state = stationId === 'therapyYard' ? 'therapy' : 'assigned';
  addLog(`${dog.name} was assigned to ${station.name}.`);

  return true;
}

export function assignFirstReadyDogToStation(stationId) {
  const dog = getAvailableDogs()[0];
  if (!dog) return false;
  return assignDogToStation(dog.id, stationId);
}

export function removeDogFromStation(dogId, logChange = true) {
  const dog = gameState.dogs.find(item => item.id === dogId);
  if (!dog) return false;

  for (const station of Object.values(gameState.stations)) {
    station.assignedDogIds = station.assignedDogIds.filter(id => id !== dogId);
  }

  if (dog.state === 'assigned' || dog.state === 'therapy') {
    dog.state = 'ready';
    dog.assignedStationId = null;

    if (logChange) {
      addLog(`${dog.name} returned to the ready dog army.`);
    }
  }

  return true;
}
