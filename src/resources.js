import { gameState } from './state.js';

export function addResource(name, amount) {
  gameState.resources[name] = Math.max(0, (gameState.resources[name] || 0) + amount);
}

export function consumeResource(name, amount) {
  if ((gameState.resources[name] || 0) < amount) return false;
  gameState.resources[name] -= amount;
  return true;
}

export function hasRequiredResources(requirements) {
  return Object.entries(requirements).every(([name, amount]) => (gameState.resources[name] || 0) >= amount);
}

export function consumeResources(requirements) {
  if (!hasRequiredResources(requirements)) return false;

  for (const [name, amount] of Object.entries(requirements)) {
    consumeResource(name, amount);
  }

  return true;
}
