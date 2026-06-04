const SECONDS_PER_GAME_DAY = 60;
const BASE_ACCLIMATISATION_DAYS = 7;
const BASE_AUTO_INTERVAL_SECONDS = 10;
const MISSION_SEARCH_TARGET = 10;
const SAVE_KEY = 'jess_dog_army_save_v1';

const RESOURCE_LABELS = {
  protein: 'Protein',
  foodBowls: 'Food Bowls',
  waterBowls: 'Water Bowls',
  blankets: 'Blankets',
};

const MISSIONS = {
  basic_rescue: {
    id: 'basic_rescue',
    name: 'Basic Rescue Mission',
    foodCost: 3,
    dogsRewarded: 1,
    unlocked: true,
  },
};

function createDefaultState() {
  return {
    version: 1,
    day: 1,
    level: 1,
    elapsedDaySeconds: 0,
    screen: 'centre',
    activeMission: null,
    resources: { protein: 0, foodBowls: 0, waterBowls: 0, blankets: 0 },
    unlocked: { chickenCoop: true, dogFoodMachine: true, missionBoard: true, waterPump: false, blanketStation: false, therapyYard: false },
    dogs: [],
    stations: {
      chickenCoop: { id: 'chickenCoop', name: 'Chicken Coop', description: 'Produces cartoon protein for dog food.', unlocked: true, assignedDogIds: [], baseIntervalSeconds: 10, outputResource: 'protein', outputAmount: 1, automationProgress: 0 },
      dogFoodMachine: { id: 'dogFoodMachine', name: 'Dog Food Machine', description: 'Turns protein into food bowls.', unlocked: true, assignedDogIds: [], baseIntervalSeconds: 10, inputResource: 'protein', inputAmount: 1, outputResource: 'foodBowls', outputAmount: 1, automationProgress: 0 },
      waterPump: { id: 'waterPump', name: 'Water Pump', description: 'Produces water bowls for thirsty new rescues.', unlocked: false, assignedDogIds: [], baseIntervalSeconds: 10, outputResource: 'waterBowls', outputAmount: 1, automationProgress: 0 },
      blanketStation: { id: 'blanketStation', name: 'Blanket Station', description: 'Produces blankets for comfort and settling in.', unlocked: false, assignedDogIds: [], baseIntervalSeconds: 10, outputResource: 'blankets', outputAmount: 1, automationProgress: 0 },
      therapyYard: { id: 'therapyYard', name: 'Therapy Yard', description: 'Mentor dogs reduce acclimatisation time.', unlocked: false, assignedDogIds: [] },
    },
    stats: { totalDogsRescued: 0, totalMissionsCompleted: 0, nextDogNumber: 1 },
    log: ['Day 1: Jess opened the rescue centre.'],
  };
}

let state = loadGame();
let lastTick = performance.now();
let renderAccumulator = 0;
const app = document.getElementById('app');

function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function loadGame() {
  const fresh = createDefaultState();
  const raw = localStorage.getItem(SAVE_KEY);
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
function resetGame() { localStorage.removeItem(SAVE_KEY); state = createDefaultState(); saveGame(); renderUI(); }
function mergeStations(base, saved) {
  const merged = {};
  for (const [id, station] of Object.entries(base)) {
    merged[id] = { ...station, ...(saved[id] || {}), assignedDogIds: Array.isArray(saved[id]?.assignedDogIds) ? saved[id].assignedDogIds : [], automationProgress: Number(saved[id]?.automationProgress || 0) };
  }
  return merged;
}
function addLog(message) { state.log.unshift(`Day ${state.day}: ${message}`); state.log = state.log.slice(0, 25); }

function addResource(name, amount) { state.resources[name] = Math.max(0, (state.resources[name] || 0) + amount); saveGame(); }
function consumeResource(name, amount) { if ((state.resources[name] || 0) < amount) return false; state.resources[name] -= amount; saveGame(); return true; }
function hasRequiredResources(req) { return Object.entries(req).every(([name, amount]) => (state.resources[name] || 0) >= amount); }
function consumeResources(req) { if (!hasRequiredResources(req)) return false; Object.entries(req).forEach(([name, amount]) => consumeResource(name, amount)); return true; }

function createDog() {
  const num = state.stats.nextDogNumber++;
  return { id: `dog_${String(num).padStart(3, '0')}`, name: `Dog ${num}`, state: 'acclimatising', rescuedDay: state.day, acclimatisationProgress: 0, assignedStationId: null };
}
function rescueDog(count = 1) {
  for (let i = 0; i < count; i++) {
    const dog = createDog();
    state.dogs.push(dog);
    state.stats.totalDogsRescued++;
    if (state.stats.totalDogsRescued === 1) {
      makeDogReady(dog.id, true);
      addLog(`${dog.name} was rescued and is ready straight away for the tutorial.`);
    } else {
      addLog(`${dog.name} was rescued and entered the kennels.`);
    }
  }
  checkProgressionUnlocks();
  saveGame();
}
function makeDogReady(dogId, silent = false) { const dog = state.dogs.find(d => d.id === dogId); if (!dog) return; dog.state = 'ready'; dog.assignedStationId = null; if (!silent) addLog(`${dog.name} finished acclimatising and joined the dog army.`); }
function getDogsByState(dogState) { return state.dogs.filter(d => d.state === dogState); }
function getAvailableDogs() { return getDogsByState('ready'); }
function getTherapyDogCount() { return state.stations.therapyYard.assignedDogIds.length; }
function getEffectiveAcclimatisationDays() { return Math.max(0, BASE_ACCLIMATISATION_DAYS - getTherapyDogCount()); }
function getCurrentAcclimatisationRequirements() { const req = { foodBowls: 1 }; if (state.unlocked.waterPump) req.waterBowls = 1; if (state.unlocked.blanketStation) req.blankets = 1; return req; }
function processAcclimatisation() {
  const requiredDays = getEffectiveAcclimatisationDays();
  for (const dog of state.dogs) {
    if (dog.state !== 'acclimatising') continue;
    if (requiredDays === 0) { makeDogReady(dog.id); continue; }
    const req = getCurrentAcclimatisationRequirements();
    if (hasRequiredResources(req)) {
      consumeResources(req);
      dog.acclimatisationProgress++;
      if (dog.acclimatisationProgress >= requiredDays) makeDogReady(dog.id);
      else addLog(`${dog.name} settled in a little more: ${dog.acclimatisationProgress}/${requiredDays}.`);
    } else {
      addLog(`${dog.name} could not progress today because supplies were missing.`);
    }
  }
}
function assignDogToStation(dogId, stationId) {
  const dog = state.dogs.find(d => d.id === dogId);
  const station = state.stations[stationId];
  if (!dog || !station || !station.unlocked || dog.state === 'acclimatising') return false;
  removeDogFromStation(dogId, false);
  station.assignedDogIds.push(dogId);
  dog.assignedStationId = stationId;
  dog.state = stationId === 'therapyYard' ? 'therapy' : 'assigned';
  addLog(`${dog.name} was assigned to ${station.name}.`);
  saveGame();
  return true;
}
function assignFirstReadyDogToStation(stationId) { const dog = getAvailableDogs()[0]; if (!dog) return false; return assignDogToStation(dog.id, stationId); }
function removeDogFromStation(dogId, logChange = true) {
  const dog = state.dogs.find(d => d.id === dogId); if (!dog) return false;
  Object.values(state.stations).forEach(station => { station.assignedDogIds = station.assignedDogIds.filter(id => id !== dogId); });
  if (dog.state === 'assigned' || dog.state === 'therapy') { dog.state = 'ready'; dog.assignedStationId = null; if (logChange) addLog(`${dog.name} returned to the ready dog army.`); }
  saveGame();
  return true;
}

function getAssignedDogCount(stationId) { return state.stations[stationId]?.assignedDogIds.length || 0; }
function getStationStatus(stationId) { const count = getAssignedDogCount(stationId); if (stationId === 'therapyYard') return `${count} mentor dog${count === 1 ? '' : 's'}`; return count > 0 ? `Automated: ${count}x output` : 'Manual only'; }
function manualProduce(stationId) { const station = state.stations[stationId]; if (!station || !station.unlocked || stationId === 'therapyYard') return; produceFromStation(stationId, 1, true); saveGame(); }
function autoProduce(stationId) { const count = getAssignedDogCount(stationId); if (count > 0) produceFromStation(stationId, Math.max(1, count), false); }
function updateAutomation(deltaSeconds) {
  for (const station of Object.values(state.stations)) {
    if (!station.unlocked || station.id === 'therapyYard' || getAssignedDogCount(station.id) <= 0) continue;
    station.automationProgress += deltaSeconds;
    while (station.automationProgress >= station.baseIntervalSeconds) { station.automationProgress -= station.baseIntervalSeconds; autoProduce(station.id); }
  }
}
function produceFromStation(stationId, amountMultiplier, shouldLog) {
  const station = state.stations[stationId];
  if (station.inputResource) {
    const possible = Math.min(amountMultiplier, Math.floor((state.resources[station.inputResource] || 0) / station.inputAmount));
    if (possible <= 0) { if (shouldLog) addLog(`${station.name} needs ${RESOURCE_LABELS[station.inputResource]}.`); return false; }
    consumeResource(station.inputResource, station.inputAmount * possible);
    addResource(station.outputResource, station.outputAmount * possible);
    if (shouldLog) addLog(`${station.name} made ${station.outputAmount * possible} ${RESOURCE_LABELS[station.outputResource]}.`);
    return true;
  }
  addResource(station.outputResource, station.outputAmount * amountMultiplier);
  if (shouldLog) addLog(`${station.name} produced ${station.outputAmount * amountMultiplier} ${RESOURCE_LABELS[station.outputResource]}.`);
  return true;
}
function unlockStation(stationId) { const station = state.stations[stationId]; if (!station || station.unlocked) return; station.unlocked = true; state.unlocked[stationId] = true; addLog(`${station.name} unlocked.`); }
function checkProgressionUnlocks() {
  const rescued = state.stats.totalDogsRescued;
  if (rescued >= 2) { state.level = Math.max(state.level, 2); unlockStation('waterPump'); }
  if (rescued >= 3) { state.level = Math.max(state.level, 3); unlockStation('blanketStation'); }
  if (rescued >= 4) state.level = Math.max(state.level, 4);
  if (rescued >= 5) { state.level = Math.max(state.level, 5); unlockStation('therapyYard'); }
  if (rescued >= 6) state.level = Math.max(state.level, 6);
}

function updateDayTimer(deltaSeconds) { state.elapsedDaySeconds += deltaSeconds; if (state.elapsedDaySeconds >= SECONDS_PER_GAME_DAY) { state.elapsedDaySeconds -= SECONDS_PER_GAME_DAY; advanceDay(); } }
function advanceDay() { state.day++; addLog('A new rescue centre day began.'); processAcclimatisation(); checkProgressionUnlocks(); saveGame(); renderUI(); }
function dayProgressPercent() { return Math.min(100, (state.elapsedDaySeconds / SECONDS_PER_GAME_DAY) * 100); }

function startMission(missionId) {
  const mission = MISSIONS[missionId]; if (!mission || !mission.unlocked) return;
  if (!consumeResource('foodBowls', mission.foodCost)) { addLog(`Not enough Food Bowls to start ${mission.name}.`); renderUI(); return; }
  state.activeMission = { missionId, progress: 0, complete: false };
  state.screen = 'mission';
  addLog(`${mission.name} started.`);
  saveGame(); renderUI();
}
function searchMission() { if (!state.activeMission || state.activeMission.complete) return; state.activeMission.progress++; if (state.activeMission.progress >= MISSION_SEARCH_TARGET) completeMission({ success: true, rescuedDogs: 1 }); saveGame(); renderUI(); }
function completeMission(result) { if (!state.activeMission) return; const mission = MISSIONS[state.activeMission.missionId]; if (result.success) { rescueDog(result.rescuedDogs || mission.dogsRewarded); state.stats.totalMissionsCompleted++; addLog(`Mission complete. ${result.rescuedDogs || mission.dogsRewarded} dog rescued.`); } else addLog('Mission failed. No dogs were rescued this time.'); state.activeMission.complete = true; checkProgressionUnlocks(); saveGame(); }
function returnFromMission() { state.activeMission = null; state.screen = 'centre'; saveGame(); renderUI(); }

function renderUI() {
  if (state.screen === 'mission') { app.innerHTML = renderMissionScreen(); return; }
  app.innerHTML = `
    <header class="hero"><div class="hero-row"><div><p class="eyebrow">Jess' Dog Army</p><h1>Rescue Centre</h1></div><div class="day-pill"><strong>Day ${state.day}</strong><br><span class="muted">Level ${state.level}</span></div></div><div class="progress"><div style="width:${dayProgressPercent()}%"></div></div></header>
    <nav class="tabs">${tab('centre','Centre')}${tab('dogs','Dog Army')}${tab('missions','Missions')}${tab('log','Log')}</nav>
    ${renderBody()}`;
}
function tab(screen, label) { return `<button class="tab ${state.screen === screen ? 'active' : ''}" data-action="screen" data-screen="${screen}">${label}</button>`; }
function renderBody() { if (state.screen === 'dogs') return renderDogs(); if (state.screen === 'missions') return renderMissions(); if (state.screen === 'log') return renderLog(); return renderCentre(); }
function tile(label, value) { return `<article class="tile"><span>${label}</span><strong>${value}</strong></article>`; }
function renderCentre() {
  return `<section class="grid">${tile('Protein', state.resources.protein)}${tile('Food Bowls', state.resources.foodBowls)}${state.unlocked.waterPump ? tile('Water Bowls', state.resources.waterBowls) : ''}${state.unlocked.blanketStation ? tile('Blankets', state.resources.blankets) : ''}</section>
  <section class="card"><h2>Dog Counts</h2><div class="grid">${tile('Acclimatising', getDogsByState('acclimatising').length)}${tile('Ready', getDogsByState('ready').length)}${tile('Assigned', getDogsByState('assigned').length)}${state.unlocked.therapyYard ? tile('Therapy', getDogsByState('therapy').length) : ''}</div><button class="secondary" data-action="advance-day">Skip to Next Day</button><p class="hint">Prototype shortcut. Days also advance every ${SECONDS_PER_GAME_DAY} seconds.</p></section>
  ${Object.values(state.stations).filter(s => s.unlocked).map(renderStation).join('')}`;
}
function renderStation(station) {
  const assigned = station.assignedDogIds.map(id => state.dogs.find(d => d.id === id)).filter(Boolean);
  const progress = station.automationProgress && station.baseIntervalSeconds ? Math.min(100, station.automationProgress / station.baseIntervalSeconds * 100) : 0;
  const isTherapy = station.id === 'therapyYard';
  return `<article class="station"><div class="station-head"><div><h2>${station.name}</h2><p class="muted">${station.description}</p></div><span class="status">${getStationStatus(station.id)}</span></div>
    <div class="meta">${isTherapy ? `<span>Effective acclimatisation: ${getEffectiveAcclimatisationDays()} day${getEffectiveAcclimatisationDays() === 1 ? '' : 's'}</span><span>7 therapy dogs = instant settling</span>` : `<span>Produces: ${station.inputResource ? `${station.inputAmount} ${RESOURCE_LABELS[station.inputResource]} → ` : ''}${station.outputAmount} ${RESOURCE_LABELS[station.outputResource]}</span><span>Dogs Assigned: ${getAssignedDogCount(station.id)}</span><div class="progress"><div style="width:${progress}%"></div></div>`}</div>
    <div class="buttons">${isTherapy ? '' : `<button data-action="produce" data-station="${station.id}">Manual Tap</button>`}<button class="secondary" data-action="assign" data-station="${station.id}" ${getAvailableDogs().length === 0 ? 'disabled' : ''}>Assign Ready Dog</button></div>
    ${assigned.length ? `<div class="chips">${assigned.map(d => `<button class="chip" data-action="remove-dog" data-dog="${d.id}">${d.name} ✕</button>`).join('')}</div>` : '<p class="hint">No dogs assigned yet.</p>'}
  </article>`;
}
function renderDogs() {
  const needs = Object.keys(getCurrentAcclimatisationRequirements()).map(k => RESOURCE_LABELS[k]).join(', ');
  return `<section class="card"><h2>Dog Army</h2><p class="hint">Daily acclimatisation needs: ${needs}. Effective days required: ${getEffectiveAcclimatisationDays()}.</p></section>${dogGroup('Acclimatising','acclimatising')}${dogGroup('Ready','ready')}${dogGroup('Assigned','assigned')}${state.unlocked.therapyYard ? dogGroup('Therapy','therapy') : ''}`;
}
function dogGroup(title, dogState) { const dogs = getDogsByState(dogState); return `<section class="card"><h2>${title}</h2>${dogs.length ? dogs.map(renderDog).join('') : '<p class="hint">None yet.</p>'}</section>`; }
function renderDog(dog) { const station = dog.assignedStationId ? state.stations[dog.assignedStationId] : null; const text = dog.state === 'acclimatising' ? `Acclimatising: ${dog.acclimatisationProgress}/${getEffectiveAcclimatisationDays()}` : (dog.state === 'assigned' || dog.state === 'therapy') ? `Assigned to: ${station?.name || 'Unknown'}` : 'Ready to assign'; return `<article class="dog-card"><strong>${dog.name}</strong><span class="muted">${text}</span>${dog.state === 'assigned' || dog.state === 'therapy' ? `<button class="secondary" data-action="remove-dog" data-dog="${dog.id}">Remove Assignment</button>` : ''}</article>`; }
function renderMissions() { return Object.values(MISSIONS).map(m => `<article class="mission-card"><h2>${m.name}</h2><p>Cost: ${m.foodCost} Food Bowls</p><p>Reward: ${m.dogsRewarded} rescued dog</p><button data-action="start-mission" data-mission="${m.id}" ${state.resources.foodBowls < m.foodCost ? 'disabled' : ''}>Start Mission</button></article>`).join(''); }
function renderMissionScreen() { const active = state.activeMission; const mission = active ? MISSIONS[active.missionId] : null; const progress = active ? Math.min(100, active.progress / MISSION_SEARCH_TARGET * 100) : 0; if (!active || !mission) return `<section class="mission-screen"><button data-action="return-centre">Return to Rescue Centre</button></section>`; return `<section class="mission-screen"><p class="eyebrow">Mission Module Placeholder</p><h1>${mission.name}</h1><p>${active.complete ? 'Success! You rescued 1 dog.' : 'Searching the area for rescue dogs.'}</p><div class="progress big-progress"><div style="width:${progress}%"></div></div><p class="muted">Progress: ${Math.round(progress)}%</p>${active.complete ? '<button data-action="return-centre">Return to Rescue Centre</button>' : '<button data-action="search-mission">Search</button>'}</section>`; }
function renderLog() { return `<section class="card"><h2>Save & Testing</h2><p class="hint">This prototype saves locally in this browser using localStorage.</p><button class="danger" data-action="reset-game">Reset Game</button></section>${state.log.map(item => `<p class="log-item">${item}</p>`).join('')}`; }

app.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  const action = button.dataset.action;
  if (action === 'screen') state.screen = button.dataset.screen;
  if (action === 'produce') manualProduce(button.dataset.station);
  if (action === 'assign') assignFirstReadyDogToStation(button.dataset.station);
  if (action === 'remove-dog') removeDogFromStation(button.dataset.dog);
  if (action === 'start-mission') startMission(button.dataset.mission);
  if (action === 'search-mission') searchMission();
  if (action === 'return-centre') returnFromMission();
  if (action === 'advance-day') advanceDay();
  if (action === 'reset-game' && confirm("Reset Jess' Dog Army and clear this browser save?")) resetGame();
  saveGame(); renderUI();
});

function loop(now) {
  const delta = Math.min(2, (now - lastTick) / 1000);
  lastTick = now;
  updateDayTimer(delta);
  updateAutomation(delta);
  renderAccumulator += delta;
  if (renderAccumulator >= .5) { renderAccumulator = 0; saveGame(); renderUI(); }
  requestAnimationFrame(loop);
}

window.JessDogArmy = { getState: () => state, saveGame, resetGame };
renderUI();
requestAnimationFrame(loop);
