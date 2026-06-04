export const RESOURCE_LABELS = {
  protein: 'Protein',
  foodBowls: 'Food Bowls',
  waterBowls: 'Water Bowls',
  blankets: 'Blankets',
};

export const RESOURCE_ICONS = {
  protein: '\u{1F95A}',
  foodBowls: '\u{1F963}',
  waterBowls: '\u{1F4A7}',
  blankets: '\u{1F9FA}',
};

export const ACTIONS = {
  feedChickens: {
    id: 'feedChickens',
    stationId: 'chickenCoop',
    label: 'Feed Chickens',
    seconds: 4,
    outputResource: 'protein',
    outputAmount: 1,
    description: 'Feed the chickens so they produce protein supplies.',
  },
  makeDogFood: {
    id: 'makeDogFood',
    stationId: 'dogFoodMachine',
    label: 'Make Dog Food',
    seconds: 8,
    inputResource: 'protein',
    inputAmount: 2,
    outputResource: 'foodBowls',
    outputAmount: 1,
    description: 'Convert 2 protein into 1 food bowl.',
  },
  pumpWater: {
    id: 'pumpWater',
    stationId: 'waterPump',
    label: 'Pump Water',
    seconds: 4,
    outputResource: 'waterBowls',
    outputAmount: 1,
    description: 'Pump clean water into bowls.',
  },
  stitchBlanket: {
    id: 'stitchBlanket',
    stationId: 'blanketStation',
    label: 'Make Blanket',
    seconds: 6,
    outputResource: 'blankets',
    outputAmount: 1,
    description: 'Create a soft blanket.',
  },
};

export const STATION_CATALOGUE = {
  chickenCoop: {
    id: 'chickenCoop',
    name: 'Chicken Coop',
    icon: '\u{1F414}',
    actionId: 'feedChickens',
    purpose: 'Produces protein supplies used by the Dog Food Machine.',
    defaultPosition: { x: 1, y: 1 },
  },
  dogFoodMachine: {
    id: 'dogFoodMachine',
    name: 'Dog Food Machine',
    icon: '\u{2699}\u{FE0F}',
    actionId: 'makeDogFood',
    purpose: 'Turns 2 protein into food bowls.',
    defaultPosition: { x: 4, y: 1 },
  },
  missionBoard: {
    id: 'missionBoard',
    name: 'Mission Board',
    icon: '\u{1F4CB}',
    actionId: null,
    purpose: 'Starts landfill searches using food bowls.',
    defaultPosition: { x: 7, y: 1 },
  },
  waterPump: {
    id: 'waterPump',
    name: 'Water Pump',
    icon: '\u{1F6B0}',
    actionId: 'pumpWater',
    purpose: 'Produces water bowls.',
    defaultPosition: { x: 2, y: 4 },
  },
  blanketStation: {
    id: 'blanketStation',
    name: 'Blanket Station',
    icon: '\u{1F9F5}',
    actionId: 'stitchBlanket',
    purpose: 'Produces blankets.',
    defaultPosition: { x: 5, y: 4 },
  },
  therapyYard: {
    id: 'therapyYard',
    name: 'Therapy Yard',
    icon: '\u{1F436}',
    actionId: null,
    purpose: 'Assign mentor dogs here to reduce acclimatisation time.',
    defaultPosition: { x: 8, y: 4 },
  },
};

export const MISSIONS = {
  landfill_search: {
    id: 'landfill_search',
    name: 'Search Landfills',
    minFoodCost: 1,
    unlocked: true,
  },
};
