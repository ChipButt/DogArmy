export const RESOURCE_LABELS = {
  protein: 'Protein',
  foodBowls: 'Food Bowls',
  waterBowls: 'Water Bowls',
  blankets: 'Blankets',
};

export const RESOURCE_ICONS = {
  protein: '🥚',
  foodBowls: '🥣',
  waterBowls: '💧',
  blankets: '🧺',
};

export const ACTIONS = {
  feedChickens: {
    id: 'feedChickens',
    stationId: 'chickenCoop',
    label: 'Feed Chickens',
    seconds: 4,
    outputResource: 'protein',
    outputAmount: 1,
    description: 'Feed the rescue-centre chickens so they produce cartoon protein supplies.',
  },
  makeDogFood: {
    id: 'makeDogFood',
    stationId: 'dogFoodMachine',
    label: 'Make Dog Food',
    seconds: 5,
    inputResource: 'protein',
    inputAmount: 1,
    outputResource: 'foodBowls',
    outputAmount: 1,
    description: 'Convert protein into food bowls for missions and acclimatising dogs.',
  },
  pumpWater: {
    id: 'pumpWater',
    stationId: 'waterPump',
    label: 'Pump Water',
    seconds: 4,
    outputResource: 'waterBowls',
    outputAmount: 1,
    description: 'Pump clean water into bowls for thirsty rescued dogs.',
  },
  stitchBlanket: {
    id: 'stitchBlanket',
    stationId: 'blanketStation',
    label: 'Make Blanket',
    seconds: 6,
    outputResource: 'blankets',
    outputAmount: 1,
    description: 'Create a soft blanket to help newly rescued dogs settle in.',
  },
};

export const STATION_CATALOGUE = {
  chickenCoop: {
    id: 'chickenCoop',
    name: 'Chicken Coop',
    icon: '🐔',
    actionId: 'feedChickens',
    purpose: 'Produces protein supplies used by the Dog Food Machine.',
    defaultPosition: { x: 1, y: 1 },
  },
  dogFoodMachine: {
    id: 'dogFoodMachine',
    name: 'Dog Food Machine',
    icon: '⚙️',
    actionId: 'makeDogFood',
    purpose: 'Turns protein into food bowls for rescue missions and daily dog care.',
    defaultPosition: { x: 4, y: 1 },
  },
  missionBoard: {
    id: 'missionBoard',
    name: 'Mission Board',
    icon: '📋',
    actionId: null,
    purpose: 'Starts rescue missions using food bowls.',
    defaultPosition: { x: 7, y: 1 },
  },
  waterPump: {
    id: 'waterPump',
    name: 'Water Pump',
    icon: '🚰',
    actionId: 'pumpWater',
    purpose: 'Produces water bowls after the rescue centre starts caring for thirsty dogs.',
    defaultPosition: { x: 2, y: 4 },
  },
  blanketStation: {
    id: 'blanketStation',
    name: 'Blanket Station',
    icon: '🧵',
    actionId: 'stitchBlanket',
    purpose: 'Produces blankets for warmth and comfort during acclimatisation.',
    defaultPosition: { x: 5, y: 4 },
  },
  therapyYard: {
    id: 'therapyYard',
    name: 'Therapy Yard',
    icon: '🐶',
    actionId: null,
    purpose: 'Assign mentor dogs here to reduce acclimatisation time for new rescues.',
    defaultPosition: { x: 8, y: 4 },
  },
};

export const MISSIONS = {
  basic_rescue: {
    id: 'basic_rescue',
    name: 'Basic Rescue Mission',
    foodCost: 3,
    dogsRewarded: 1,
    unlocked: true,
  },
};
