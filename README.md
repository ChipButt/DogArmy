# Jess' Dog Army

A mobile-first idle/resource-management prototype about rescuing dogs and building a growing dog army that helps run a rescue centre.

Dogs are never used for fighting. Dogs are rescued, cared for, acclimatised, and then assigned to jobs that automate and speed up resource production.

## Current prototype includes

- Mobile-first browser app
- Local save via `localStorage`
- Day/calendar system from Day 1
- Manual production for Chicken Coop, Dog Food Machine, Water Pump, and Blanket Station
- Placeholder rescue mission module
- Dog rescue and acclimatisation
- Dog assignment to production stations
- Station automation when at least one dog is assigned
- More dogs assigned to a station produce more output
- Unlock progression:
  - Dog 2 unlocks Water Pump
  - Dog 3 unlocks Blanket Station
  - Dog 5 unlocks Therapy Yard
- Therapy dogs reduce acclimatisation time
- Reset button for testing

## Run locally

Open `index.html` directly in a browser, or run a simple local server from the repo folder:

```bash
python3 -m http.server 8123
```

Then open:

```text
http://127.0.0.1:8123
```

## First-build notes

- One in-game day currently equals 60 real-time seconds.
- The first rescued dog becomes ready immediately so the player can learn assignment and automation quickly.
- The mission screen is intentionally basic and replaceable. The main game only cares about mission cost and result.
- Dogs are permanent helpers and are never sold, killed, sacrificed, consumed, or used for combat.

## File structure

```text
index.html
styles.css
package.json
src/app.js
```

This first GitHub push uses a compact single-file game module in `src/app.js` so the prototype is easy to open and test immediately. The logic is separated internally into clear state, resource, dog, station, calendar, mission, save, and UI sections so it can be split into separate files cleanly later.
