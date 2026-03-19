# localStorage for Game Saves

## What Is It?

`localStorage` is a simple key-value store built into every browser that persists data across page refreshes and browser restarts. Think of it as a tiny filing cabinet in the browser: you put a document in a labeled folder (key), and it stays there until you delete it. For games, this is how you save high scores, settings, level progress, and game state without needing a server.

Data is stored as strings, so objects must be serialized with `JSON.stringify` and deserialized with `JSON.parse`. Storage is limited (typically 5-10 MB per origin) and synchronous, so avoid storing or reading large data every frame.

## How It Works

```
Core API:
  localStorage.setItem(key, value)   // store (value must be string)
  localStorage.getItem(key)          // retrieve (returns string | null)
  localStorage.removeItem(key)       // delete one key
  localStorage.clear()               // delete everything

Storing objects:
  const data = { score: 100, level: 3 };
  localStorage.setItem("save", JSON.stringify(data));

Loading objects:
  const raw = localStorage.getItem("save");
  const data = raw ? JSON.parse(raw) : defaultData;

When to save:
  - On level complete
  - On game over (high score)
  - On settings change
  - On explicit "Save" button
  - NOT every frame (synchronous I/O = jank)

Data flow:
  Game State → JSON.stringify → localStorage.setItem
  localStorage.getItem → JSON.parse → Game State
```

## Code Example

```typescript
interface SaveData {
  highScore: number;
  levelsCompleted: number[];
  settings: {
    musicVolume: number;
    sfxVolume: number;
  };
}

const SAVE_KEY = "canvas-game-save";

const DEFAULT_SAVE: SaveData = {
  highScore: 0,
  levelsCompleted: [],
  settings: { musicVolume: 0.7, sfxVolume: 1.0 },
};

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    // Merge with defaults to handle missing fields from old versions
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    // Corrupted data or localStorage unavailable
    console.warn("Failed to load save, using defaults");
    return { ...DEFAULT_SAVE };
  }
}

function saveToDisk(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    console.warn("Failed to save (storage full or unavailable)");
  }
}

function updateHighScore(current: number): void {
  const save = loadSave();
  if (current > save.highScore) {
    save.highScore = current;
    saveToDisk(save);
  }
}

// Usage
updateHighScore(4200);
const save = loadSave();
console.log(`High score: ${save.highScore}`); // 4200
```

## Used In These Games

- **Snake**: High score is saved to localStorage so it persists across sessions. The `ScoreSystem` in `src/games/snake/systems/ScoreSystem.ts` reads and writes the best score.
- **Tetris**: High score and possibly DAS settings can be persisted.
- **Tower Defense**: The furthest wave reached and any unlocked upgrades can be saved between sessions.
- **Platformer**: Level completion progress is saved so the player can resume from the last unlocked level.

## Common Pitfalls

- **Not wrapping in try/catch**: localStorage can throw in private browsing mode, when storage is full, or when disabled by browser policy. Always wrap both `getItem` and `setItem` in try/catch.
- **Storing every frame**: `localStorage.setItem` is synchronous and blocks the main thread. Writing a large JSON string 60 times per second causes noticeable frame drops. Save only on significant events (level complete, game over, pause).
- **No migration for schema changes**: If you add a new field to your save format, old save data will not have it. Always merge loaded data with defaults (`{ ...DEFAULT, ...loaded }`) so missing fields get default values.
- **Not namespacing keys**: Using a generic key like `"save"` can collide with other apps on the same origin. Prefix with your game name: `"canvas-game-save"`.
- **Storing sensitive data**: localStorage is not encrypted and is accessible to any JavaScript on the same origin. Never store passwords, tokens, or personal data. Game progress and scores only.
