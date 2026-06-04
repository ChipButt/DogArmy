import { ACTIONS, MISSIONS, RESOURCE_ICONS, RESOURCE_LABELS, STATION_CATALOGUE } from './gameData.js';
import { CONFIG, addLog, closeStationPopup, enterEditMode, exitEditMode, gameState, replaceGameState, selectStation } from './state.js';
import { loadGame, resetGame, saveGame } from './save.js';
import { addResource, consumeResource, consumeResources, hasRequiredResources } from './resources.js';

const app = document.getElementById('app');
let lastTick = performance.now();
let renderTimer = 0;
let pressState = null;
let longPressTimer = null;

function initGame() {
  replaceGameState(loadGame());
  normaliseStations();
  renderUI();
  requestAnimationFrame(loop);
}

function normaliseStations() {
  for (const station of Object.values(gameState.stations)) {
    if (!Array.isArray(station.actionQueue)) station.actionQueue = [];
    if (!Array.isArray(station.pendingProducts)) station.pendingProducts = [];
  }
}

function loop(now) {
  const deltaSeconds = Math.min(2, (now - lastTick) / 1000);
  lastTick = now;
  updateDayTimer(deltaSeconds);
  updateStationActions(deltaSeconds);
  updateAutomation(deltaSeconds);
  renderTimer += deltaSeconds;
  if (renderTimer >= 0.2) {
    renderTimer = 0;
    saveGame();
    renderUI();
  }
  requestAnimationFrame(loop);
}

function updateDayTimer(deltaSeconds) {
  gameState.elapsedDaySeconds += deltaSeconds;
  if (gameState.elapsedDaySeconds >= CONFIG.secondsPerGameDay) {
    gameState.elapsedDaySeconds -= CONFIG.secondsPerGameDay;
    advanceDay();
  }
}

function advanceDay() {
  gameState.day += 1;
  addLog('A new rescue-centre day began.');
  processAcclimatisation();
  checkProgressionUnlocks();
}

function updateStationActions(deltaSeconds) {
  for (const station of Object.values(gameState.stations)) {
    if (!station.activeAction) {
      startNextQueuedAction(station.id);
      continue;
    }

    station.activeAction.elapsed += deltaSeconds;
    const action = ACTIONS[station.activeAction.actionId];

    if (action && station.activeAction.elapsed >= action.seconds) {
      completeStationAction(station.id);
      startNextQueuedAction(station.id);
    }
  }
}

function updateAutomation(deltaSeconds) {
  for (const station of Object.values(gameState.stations)) {
    if (!station.unlocked || station.id === 'therapyYard' || station.id === 'missionBoard') continue;

    const dogCount = station.assignedDogIds.length;
    if (dogCount <= 0 || getStationSlotCount(station.id) >= CONFIG.maxStationOutputSlots) continue;

    station.automationProgress += deltaSeconds;
    const interval = Math.max(2.5, 10 / dogCount);

    if (station.automationProgress >= interval) {
      station.automationProgress = 0;
      const actionId = STATION_CATALOGUE[station.id]?.actionId;
      if (actionId) queueStationAction(station.id, actionId, true);
    }
  }
}

function getStationSlotCount(stationId) {
  const station = gameState.stations[stationId];
  if (!station) return 0;
  return station.pendingProducts.length + station.actionQueue.length + (station.activeAction ? 1 : 0);
}

function canQueueAction(stationId, actionId) {
  const station = gameState.stations[stationId];
  const action = ACTIONS[actionId];
  if (!station || !station.unlocked || !action) return false;
  if (getStationSlotCount(stationId) >= CONFIG.maxStationOutputSlots) return false;
  if (action.inputResource && gameState.resources[action.inputResource] < action.inputAmount) return false;
  return true;
}

function queueStationAction(stationId, actionId, automated = false) {
  const station = gameState.stations[stationId];
  const action = ACTIONS[actionId];
  if (!station || !action || !canQueueAction(stationId, actionId)) return false;

  if (action.inputResource && !consumeResource(action.inputResource, action.inputAmount)) {
    if (!automated) addLog(`${station.name} needs ${RESOURCE_LABELS[action.inputResource]}.`);
    return false;
  }

  station.actionQueue.push({ actionId, automated });
  if (!automated) addLog(`${action.label} queued at ${station.name}.`);
  startNextQueuedAction(stationId);
  return true;
}

function startNextQueuedAction(stationId) {
  const station = gameState.stations[stationId];
  if (!station || station.activeAction || station.actionQueue.length === 0) return;

  const next = station.actionQueue.shift();
  station.activeAction = {
    actionId: next.actionId,
    elapsed: 0,
    automated: next.automated,
  };
}

function completeStationAction(stationId) {
  const station = gameState.stations[stationId];
  if (!station?.activeAction) return;

  const action = ACTIONS[station.activeAction.actionId];
  station.activeAction = null;
  if (!action) return;

  station.pendingProducts.push({
    id: `product_${gameState.stats.nextProductId++}`,
    resource: action.outputResource,
    amount: action.outputAmount,
    createdAtDay: gameState.day,
  });

  addLog(`${station.name} produced ${action.outputAmount} ${RESOURCE_LABELS[action.outputResource]}. Tap the stack beside the machine to collect it.`);
}

function collectProduct(stationId, productId) {
  const station = gameState.stations[stationId];
  if (!station) return;

  const product = station.pendingProducts.find(item => item.id === productId);
  if (!product) return;

  addResource(product.resource, product.amount);
  station.pendingProducts = station.pendingProducts.filter(item => item.id !== productId);
  addLog(`Collected ${product.amount} ${RESOURCE_LABELS[product.resource]}.`);
}

function moveStationToTile(stationId, x, y) {
  const station = gameState.stations[stationId];
  if (!station) return;

  station.position.x = clamp(x, 0, CONFIG.gridColumns - 1);
  station.position.y = clamp(y, 0, CONFIG.gridRows - 1);
}

function moveStationToPointer(stationId, event) {
  const plot = document.querySelector('[data-plot]');
  if (!plot) return;

  const rect = plot.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * CONFIG.gridColumns);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * CONFIG.gridRows);
  moveStationToTile(stationId, x, y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rescueDog(count = 1) {
  for (let index = 0; index < count; index += 1) {
    const dogNumber = gameState.stats.nextDogNumber++;
    const dog = {
      id: `dog_${String(dogNumber).padStart(3, '0')}`,
      name: `Dog ${dogNumber}`,
      state: 'acclimatising',
      rescuedDay: gameState.day,
      acclimatisationProgress: 0,
      assignedStationId: null,
    };

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

function makeDogReady(dogId, silent = false) {
  const dog = gameState.dogs.find(item => item.id === dogId);
  if (!dog) return;

  dog.state = 'ready';
  dog.assignedStationId = null;

  if (!silent) addLog(`${dog.name} finished acclimatising and joined the dog army.`);
}

function getDogsByState(state) {
  return gameState.dogs.filter(dog => dog.state === state);
}

function getAvailableDogs() {
  return getDogsByState('ready');
}

function getTherapyDogCount() {
  return gameState.stations.therapyYard.assignedDogIds.length;
}

function getEffectiveAcclimatisationDays() {
  return Math.max(0, CONFIG.baseAcclimatisationDays - getTherapyDogCount());
}

function getCurrentAcclimatisationRequirements() {
  const requirements = { foodBowls: 1 };
  if (gameState.stations.waterPump.unlocked) requirements.waterBowls = 1;
  if (gameState.stations.blanketStation.unlocked) requirements.blankets = 1;
  return requirements;
}

function processAcclimatisation() {
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
      if (dog.acclimatisationProgress >= requiredDays) makeDogReady(dog.id);
      else addLog(`${dog.name} settled in a little more: ${dog.acclimatisationProgress}/${requiredDays}.`);
    } else {
      addLog(`${dog.name} could not progress today because supplies were missing.`);
    }
  }
}

function assignFirstReadyDogToStation(stationId) {
  const dog = getAvailableDogs()[0];
  if (!dog) return false;
  return assignDogToStation(dog.id, stationId);
}

function assignDogToStation(dogId, stationId) {
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

function removeDogFromStation(dogId, logChange = true) {
  const dog = gameState.dogs.find(item => item.id === dogId);
  if (!dog) return false;

  for (const station of Object.values(gameState.stations)) {
    station.assignedDogIds = station.assignedDogIds.filter(id => id !== dogId);
  }

  if (dog.state === 'assigned' || dog.state === 'therapy') {
    dog.state = 'ready';
    dog.assignedStationId = null;
    if (logChange) addLog(`${dog.name} returned to the ready dog army.`);
  }

  return true;
}

function checkProgressionUnlocks() {
  const total = gameState.stats.totalDogsRescued;
  if (total >= 2) unlockStation('waterPump', 2);
  if (total >= 3) unlockStation('blanketStation', 3);
  if (total >= 4) gameState.level = Math.max(gameState.level, 4);
  if (total >= 5) unlockStation('therapyYard', 5);
  if (total >= 6) gameState.level = Math.max(gameState.level, 6);
}

function unlockStation(stationId, level) {
  const station = gameState.stations[stationId];
  if (!station || station.unlocked) return;

  station.unlocked = true;
  gameState.level = Math.max(gameState.level, level);
  addLog(`${station.name} unlocked and can now be used on the plot.`);
}

function startMission(missionId) {
  const mission = MISSIONS[missionId];
  if (!mission) return;

  if (!consumeResource('foodBowls', mission.foodCost)) {
    addLog(`Not enough Food Bowls to start ${mission.name}.`);
    return;
  }

  gameState.activeMission = { missionId, progress: 0, complete: false };
  closeStationPopup();
  exitEditMode();
  addLog(`${mission.name} started.`);
}

function searchMission() {
  if (!gameState.activeMission || gameState.activeMission.complete) return;

  gameState.activeMission.progress += 1;
  if (gameState.activeMission.progress >= CONFIG.missionSearchTarget) {
    completeMission({ success: true, rescuedDogs: 1 });
  }
}

function completeMission(result) {
  if (!gameState.activeMission) return;

  const mission = MISSIONS[gameState.activeMission.missionId];

  if (result.success) {
    rescueDog(result.rescuedDogs || mission.dogsRewarded);
    gameState.stats.totalMissionsCompleted += 1;
    addLog(`Mission complete. ${result.rescuedDogs || mission.dogsRewarded} dog rescued.`);
  } else {
    addLog('Mission failed. No dogs were rescued this time.');
  }

  gameState.activeMission.complete = true;
}

function returnFromMission() {
  gameState.activeMission = null;
}

function getDayProgressPercent() {
  return Math.min(100, (gameState.elapsedDaySeconds / CONFIG.secondsPerGameDay) * 100);
}

function renderUI() {
  if (gameState.activeMission) {
    app.innerHTML = renderMissionOverlay();
    return;
  }

  app.innerHTML = `<section class="game-screen ${gameState.editModeStationId ? 'editing' : ''}">${renderTopBar()}${renderPlot()}${renderBottomDock()}${renderStationPopup()}${renderEditModeBanner()}</section>`;
}

function renderTopBar() {
  return `<header class="top-bar"><div><p class="eyebrow">Jess' Dog Army</p><h1>Rescue Plot</h1></div><div class="day-card"><strong>Day ${gameState.day}</strong><span>Level ${gameState.level}</span><div class="mini-progress"><div style="width:${getDayProgressPercent()}%"></div></div></div></header><div class="resource-strip">${resourcePill('protein')}${resourcePill('foodBowls')}${gameState.stations.waterPump.unlocked ? resourcePill('waterBowls') : ''}${gameState.stations.blanketStation.unlocked ? resourcePill('blankets') : ''}</div>`;
}

function resourcePill(resource) {
  return `<div class="resource-pill"><span>${RESOURCE_ICONS[resource]}</span><strong>${gameState.resources[resource]}</strong><small>${RESOURCE_LABELS[resource]}</small></div>`;
}

function renderPlot() {
  return `<main class="plot-wrap"><div class="plot-land" data-plot><div class="plot-texture"></div><div class="visible-grid"></div>${Object.values(gameState.stations).filter(station => station.unlocked).map(renderPlacedStation).join('')}</div></main>`;
}

function renderPlacedStation(station) {
  const catalogue = STATION_CATALOGUE[station.id];
  const left = ((station.position.x + 0.5) / CONFIG.gridColumns) * 100;
  const top = ((station.position.y + 0.5) / CONFIG.gridRows) * 100;
  const action = station.activeAction ? ACTIONS[station.activeAction.actionId] : null;
  const progress = station.activeAction && action ? Math.min(100, (station.activeAction.elapsed / action.seconds) * 100) : 0;
  const selected = gameState.selectedStationId === station.id;
  const editing = gameState.editModeStationId === station.id;

  return `<button class="machine ${selected ? 'selected' : ''} ${editing ? 'editing-target' : ''}" data-action="select-station" data-station="${station.id}" style="left:${left}%; top:${top}%"><span class="machine-shadow"></span><span class="machine-icon">${catalogue.icon}</span><span class="machine-label">${station.name}</span>${station.activeAction ? `<span class="action-ring" style="--progress:${progress}"><span>${Math.round(progress)}%</span></span>` : ''}${station.actionQueue.length ? `<span class="queue-badge">+${station.actionQueue.length}</span>` : ''}</button>${station.pendingProducts.map((product, index) => renderProduct(station, product, index)).join('')}`;
}

function renderProduct(station, product, index) {
  const left = ((station.position.x + 1.08 + index * 0.42) / CONFIG.gridColumns) * 100;
  const top = ((station.position.y + 0.68) / CONFIG.gridRows) * 100;
  return `<button class="product-bubble stack-${index}" data-action="collect-product" data-station="${station.id}" data-product="${product.id}" style="left:${left}%; top:${top}%"><span>${RESOURCE_ICONS[product.resource]}</span><small>+${product.amount}</small></button>`;
}

function renderBottomDock() {
  return `<footer class="bottom-dock"><button data-action="open-dogs">Dogs: ${gameState.dogs.length}</button><button data-action="advance-day">Next Day</button><button data-action="open-log">Log</button><button class="danger" data-action="reset-game">Reset</button></footer>`;
}

function renderEditModeBanner() {
  if (!gameState.editModeStationId) return '';
  const station = gameState.stations[gameState.editModeStationId];
  return `<div class="edit-banner"><strong>Placement mode</strong><span>Drag ${station.name} to a grid tile.</span><button data-action="exit-edit-mode">Done</button></div>`;
}

function renderStationPopup() {
  const stationId = gameState.selectedStationId;
  if (!stationId || gameState.editModeStationId) return '';

  const station = gameState.stations[stationId];
  const catalogue = STATION_CATALOGUE[stationId];
  if (!station || !catalogue) return '';
  if (stationId === 'missionBoard') return renderMissionBoardPopup(station, catalogue);
  if (stationId === 'therapyYard') return renderTherapyPopup(station, catalogue);

  const action = ACTIONS[catalogue.actionId];
  const assignedDogs = station.assignedDogIds.map(id => gameState.dogs.find(dog => dog.id === id)).filter(Boolean);
  const canStart = action && canQueueAction(station.id, action.id);

  return `<aside class="popup-card"><button class="popup-close" data-action="close-popup">×</button><div class="popup-head"><span>${catalogue.icon}</span><div><h2>${station.name}</h2><p>${catalogue.purpose}</p></div></div><div class="popup-section"><strong>Purpose</strong><p>${action?.description || catalogue.purpose}</p></div>${renderProductionSlots(station, action)}<div class="popup-actions"><button data-action="queue-station-action" data-station="${station.id}" data-station-action="${action.id}" ${canStart ? '' : 'disabled'}>${action.label}</button><button class="secondary" data-action="assign-dog" data-station="${station.id}" ${getAvailableDogs().length ? '' : 'disabled'}>Assign Ready Dog</button></div><div class="assigned-list"><strong>Assigned dogs: ${assignedDogs.length}</strong>${assignedDogs.length ? assignedDogs.map(dog => `<button class="chip" data-action="remove-dog" data-dog="${dog.id}">${dog.name} ✕</button>`).join('') : '<p>No dogs assigned yet.</p>'}</div></aside>`;
}

function renderProductionSlots(station, action) {
  const slots = [];
  const products = [...station.pendingProducts];
  const queued = [...station.actionQueue];

  for (let index = 0; index < CONFIG.maxStationOutputSlots; index += 1) {
    if (index < products.length) {
      const product = products[index];
      slots.push(`<button class="slot product-slot" data-action="collect-product" data-station="${station.id}" data-product="${product.id}">${RESOURCE_ICONS[product.resource]}</button>`);
      continue;
    }

    const actionIndex = index - products.length;
    if (actionIndex === 0 && station.activeAction && action) {
      const progress = Math.min(100, (station.activeAction.elapsed / action.seconds) * 100);
      slots.push(`<div class="slot timer-slot" style="--progress:${progress}"><span>${Math.ceil(Math.max(0, action.seconds - station.activeAction.elapsed))}s</span></div>`);
      continue;
    }

    const queueIndex = actionIndex - (station.activeAction ? 1 : 0);
    if (queued[queueIndex]) {
      slots.push(`<div class="slot queued-slot">⏳</div>`);
      continue;
    }

    slots.push('<div class="slot empty-slot"></div>');
  }

  return `<div class="popup-section"><strong>${action?.label || 'Production'} timer</strong><div class="production-slots">${slots.join('')}</div><p>${getStationSlotCount(station.id)}/${CONFIG.maxStationOutputSlots} output slots used. Collect products to free space.</p></div>`;
}

function renderMissionBoardPopup(station, catalogue) {
  const mission = MISSIONS.basic_rescue;
  return `<aside class="popup-card"><button class="popup-close" data-action="close-popup">×</button><div class="popup-head"><span>${catalogue.icon}</span><div><h2>${station.name}</h2><p>${catalogue.purpose}</p></div></div><div class="popup-section"><strong>${mission.name}</strong><p>Cost: ${mission.foodCost} Food Bowls. Reward: ${mission.dogsRewarded} rescued dog.</p></div><button data-action="start-mission" data-mission="${mission.id}" ${gameState.resources.foodBowls >= mission.foodCost ? '' : 'disabled'}>Start Rescue Mission</button></aside>`;
}

function renderTherapyPopup(station, catalogue) {
  const assignedDogs = station.assignedDogIds.map(id => gameState.dogs.find(dog => dog.id === id)).filter(Boolean);
  return `<aside class="popup-card"><button class="popup-close" data-action="close-popup">×</button><div class="popup-head"><span>${catalogue.icon}</span><div><h2>${station.name}</h2><p>${catalogue.purpose}</p></div></div><div class="popup-section"><strong>Therapy effect</strong><p>Therapy dogs reduce acclimatisation by 1 day each. Current requirement: ${getEffectiveAcclimatisationDays()} day(s).</p></div><button data-action="assign-dog" data-station="${station.id}" ${getAvailableDogs().length ? '' : 'disabled'}>Assign Therapy Dog</button><div class="assigned-list">${assignedDogs.length ? assignedDogs.map(dog => `<button class="chip" data-action="remove-dog" data-dog="${dog.id}">${dog.name} ✕</button>`).join('') : '<p>No therapy dogs assigned yet.</p>'}</div></aside>`;
}

function renderMissionOverlay() {
  const mission = MISSIONS[gameState.activeMission.missionId];
  const progress = Math.min(100, (gameState.activeMission.progress / CONFIG.missionSearchTarget) * 100);
  return `<section class="mission-overlay"><div class="popup-card mission-card"><p class="eyebrow">Placeholder Mission Module</p><h1>${mission.name}</h1><p>${gameState.activeMission.complete ? 'Success! You rescued a dog.' : 'Tap search to fill the mission progress.'}</p><div class="big-ring" style="--progress:${progress}"><span>${Math.round(progress)}%</span></div>${gameState.activeMission.complete ? '<button data-action="return-mission">Return to Rescue Plot</button>' : '<button data-action="search-mission">Search</button>'}</div></section>`;
}

app.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;

  if (action === 'select-station') {
    if (!pressState?.longPressTriggered && !gameState.editModeStationId) selectStation(button.dataset.station);
  }
  if (action === 'close-popup') closeStationPopup();
  if (action === 'exit-edit-mode') exitEditMode();
  if (action === 'queue-station-action') queueStationAction(button.dataset.station, button.dataset.stationAction, false);
  if (action === 'collect-product') collectProduct(button.dataset.station, button.dataset.product);
  if (action === 'assign-dog') assignFirstReadyDogToStation(button.dataset.station);
  if (action === 'remove-dog') removeDogFromStation(button.dataset.dog);
  if (action === 'advance-day') advanceDay();
  if (action === 'start-mission') startMission(button.dataset.mission);
  if (action === 'search-mission') searchMission();
  if (action === 'return-mission') returnFromMission();
  if (action === 'open-dogs') addLog(`Dogs: ${gameState.dogs.length}. Ready: ${getAvailableDogs().length}. Acclimatising: ${getDogsByState('acclimatising').length}.`);
  if (action === 'open-log') alert(gameState.log.slice(0, 10).join('\n'));
  if (action === 'reset-game' && confirm("Reset Jess' Dog Army?")) resetGame();

  saveGame();
  renderUI();
});

window.addEventListener('pointerdown', event => {
  const machine = event.target.closest('.machine');
  if (!machine) return;

  pressState = {
    stationId: machine.dataset.station,
    startX: event.clientX,
    startY: event.clientY,
    longPressTriggered: false,
    dragging: false,
  };

  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    if (!pressState) return;
    pressState.longPressTriggered = true;
    enterEditMode(pressState.stationId);
    addLog(`Placement mode opened for ${gameState.stations[pressState.stationId].name}.`);
    saveGame();
    renderUI();
  }, CONFIG.longPressMs);
});

window.addEventListener('pointermove', event => {
  if (!pressState) return;

  const distance = Math.hypot(event.clientX - pressState.startX, event.clientY - pressState.startY);
  if (distance > 8) pressState.dragging = true;

  if (gameState.editModeStationId === pressState.stationId) {
    event.preventDefault();
    moveStationToPointer(pressState.stationId, event);
    saveGame();
    renderUI();
  }
}, { passive: false });

window.addEventListener('pointerup', () => {
  clearTimeout(longPressTimer);
  pressState = null;
});

window.JessDogArmy = { getState: () => gameState, saveGame, resetGame };
initGame();
