# Arena FPS

A browser-based 3D first-person shooter built with [Three.js](https://threejs.org/) (r128). Survive endless waves of computer-controlled enemies in a circular arena.

## Play

Open `index.html` in any modern browser — no server or internet connection required. All assets are local.

## Controls

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move forward / backward |
| `←` / `→` | Turn left / right |
| `Space` | Shoot |
| `R` | Reload |

## Gameplay

- Waves spawn automatically — each wave adds more enemies and introduces stronger types
- Clear all enemies in a wave to advance; the next wave begins after a short pause
- The game ends when your health reaches 0
- Survive as many waves as possible and maximise your score

## Player Stats

| Stat | Value |
|------|-------|
| Health | 250 HP |
| Magazine | 12 rounds |
| Reload time | 1.8 s |

## Enemy Types

| Enemy | Colour | HP | Points | Trait |
|-------|--------|----|--------|-------|
| Soldier | Red | 60 | 100 | Balanced |
| Tank | Orange | 130 | 250 | Slow, high HP |
| Runner | Purple | 30 | 150 | Fast, fragile |
| Sniper | Blue | 50 | 200 | Precise, deadly |

Higher-tier enemies unlock in later waves.

## Tech Stack

- **Renderer** — Three.js r128 (WebGL, PCF soft shadows)
- **Language** — Vanilla JavaScript (ES5-compatible, no build step)
- **Assets** — `three.min.js` bundled locally; no external dependencies at runtime

## Project Structure

```
3D-game/
├── index.html      # Entry point & HUD markup
├── styles.css      # UI styles (start screen, HUD, overlays)
├── game.js         # All game logic
└── three.min.js    # Three.js r128 (local copy)
```
