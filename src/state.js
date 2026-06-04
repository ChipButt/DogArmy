export let gameState = createDefaultState();

export function createDefaultState() {
  return {
    version: 1,
    day: 1,
    level: 1,
    elapsedDaySeconds: 0,
    screen: 'centre',
    activeMission: null,
    resources: {
      protein: 0,
      foodBowls: 0,
      waterBowls: 0,
      blankets: 0,
    },
    unlocked: {
      chickenCoop: true,
      dogFoodMachine: true,
      missionBoard: true,
      waterPump: false,
      blanketStation: false,
      therapyYard: false,
    },
    dogs: [],
    stations: {
      chickenCoop: {
        id: 'chickenCoop',
        name: 'Chicken Coop',
        description: 'Produces cartoon protein for dog food.',
        unlocked: true,
        assignedDogIds: [],
        baseIntervalSeconds: 10,
        outputResource: 'protein',
        outputAmount: 1,
        automationProgress: 0,
      },
      dogFoodMachine: {
        id: 'dogFoodMachine',
        name: 'Dog Food Machine',
        description: 'Turns protein into food bowls.',
        unlocked: true,
        assignedDogIds: [],
        baseIntervalSeconds: 10,
        inputResource: 'protein',
        inputAmount: 1,
        outputResource: 'foodBowls',
        outputAmount: 1,
        automationProgress: 0,
      },
      waterPump: {
        id: 'waterPump',
        name: 'Water Pump',
        description: 'Produces water bowls for thirsty new rescues.',
        unlocked: false,
        assignedDogIds: [],
        baseIntervalSeconds: 10,
        outputResource: 'waterBowls',
        outputAmount: 1,
        automationProgress: 0,
      },
      blanketStation: {
        id: 'blanketStation',
        name: 'Blanket Station',
        description: 'Produces blankets for comfort and settling in.',
        unlocked: false,
        assignedDogIds: [],
        baseIntervalSeconds: 10,
        outputResource: 'blankets',
        outputAmount: 1,
        automationProgress: 0,
      },
      therapyYard: {
        id: 'therapyYard',
        name: 'Therapy Yard',
        description: 'Mentor dogs reduce acclimatisation time.',
        unlocked: false,
        assignedDogIds: [],
      },
    },
    stats: {
      totalDogsRescued: 0,
      totalMissionsCompleted: 0,
      nextDogNumber: 1,
    },
    log: ['Day 1: Jess opened the rescue centre.'],
  };
}

export function replaceGameState(nextState) {
  gameState = nextState;
}

export function addLog(message) {
  gameState.log.unshift(`Day ${gameState.day}: ${message}`);
  gameState.log = gameState.log.slice(0, 25);
}

export function setScreen(screen) {
  gameState.screen = screen;
}
