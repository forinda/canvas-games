# Step 1: Word Data & Falling Words

**Goal:** Set up a word bank and spawn words that fall from the top of the screen.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **Dark game background** with subtle horizontal grid lines
- **Word bank** containing hundreds of common English words of varying lengths
- **Falling words** that spawn at random horizontal positions above the screen
- **Downward movement** with per-word speed variance
- **Danger zone** at the bottom with a red gradient and dashed line

---

## Concepts

- **Word Bank Design**: A flat array of strings grouped by length (3-8 letters) provides varied difficulty
- **Spawning Off-Screen**: Words start at `y = -FONT_SIZE` so they slide in smoothly from the top edge
- **Speed Variance**: Each word gets a base speed plus a random multiplier (`0.7`-`1.3`) so they don't move in lockstep
- **Delta-Time Movement**: `word.y += word.speed * (dt / 1000)` for frame-rate independent falling

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/typing-speed/types.ts`

Define the core interfaces and constants the whole game will use. We set up fields for later steps (lives, scoring) but only use a few right now.

```typescript
export interface FallingWord {
  text: string;
  x: number;
  y: number;
  speed: number;
  typed: string;
}

export interface TypingState {
  words: FallingWord[];
  activeWord: FallingWord | null;
  currentInput: string;
  score: number;
  lives: number;
  gameOver: boolean;
  paused: boolean;
  started: boolean;
  totalTyped: number;
  correctTyped: number;
  wordsCompleted: number;
  startTime: number;
  elapsedTime: number;
  spawnTimer: number;
  spawnInterval: number;
  baseSpeed: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const MAX_LIVES = 3;
export const INITIAL_SPAWN_INTERVAL = 2000;
export const MIN_SPAWN_INTERVAL = 600;
export const BASE_WORD_SPEED = 40;
export const SPEED_INCREMENT = 0.003;
export const FONT_SIZE = 22;
export const HS_KEY = 'typing_speed_highscore';
```

**What's happening:**
- `FallingWord` stores the word text, its canvas position, its individual speed, and how much has been typed so far.
- `TypingState` holds everything: the active words array, input tracking, scoring, and timing.
- `INITIAL_SPAWN_INTERVAL` is 2 seconds between spawns. Later steps will shrink this for difficulty scaling.

---

### 2. Create the Word Bank

**File:** `src/contexts/canvas2d/games/typing-speed/data/words.ts`

A large list of common English words from 3 to 8+ letters. Short words are easy targets; longer words reward more points later.

```typescript
export const WORD_LIST: string[] = [
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'let', 'may', 'new', 'now', 'old', 'see', 'way', 'who',
  'boy', 'did', 'big', 'few', 'got', 'own', 'say', 'she', 'too', 'use',
  'able', 'back', 'been', 'call', 'came', 'come', 'each', 'find', 'from',
  'give', 'good', 'have', 'help', 'here', 'high', 'home', 'just', 'keep',
  'know', 'last', 'life', 'line', 'long', 'look', 'made', 'make', 'many',
  'more', 'most', 'much', 'must', 'name', 'next', 'only', 'open', 'over',
  'part', 'play', 'read', 'real', 'said', 'same', 'show', 'side', 'some',
  'sort', 'such', 'sure', 'take', 'tell', 'than', 'them', 'then', 'they',
  'time', 'turn', 'used', 'very', 'want', 'well', 'went', 'what', 'when',
  'will', 'with', 'word', 'work', 'year',
  'about', 'after', 'again', 'being', 'below', 'black', 'board', 'bring',
  'brown', 'build', 'carry', 'catch', 'cause', 'chain', 'chair', 'cheap',
  'check', 'child', 'claim', 'class', 'clean', 'clear', 'climb', 'close',
  'color', 'could', 'count', 'court', 'cover', 'cross', 'dance', 'death',
  'doubt', 'dozen', 'draft', 'drawn', 'dream', 'dress', 'drink', 'drive',
  'early', 'earth', 'eight', 'empty', 'enemy', 'enjoy', 'enter', 'equal',
  'error', 'essay', 'event', 'every', 'exact', 'extra', 'faith', 'false',
  'fault', 'field', 'fight', 'final', 'first', 'fixed', 'flash', 'fleet',
  'floor', 'focus', 'force', 'found', 'frame', 'fresh', 'front', 'fruit',
  'funny', 'given', 'glass', 'grace', 'grain', 'grand', 'grant', 'grass',
  'grave', 'great', 'green', 'gross', 'group', 'grown', 'guard', 'guess',
  'guide', 'happy', 'heart', 'heavy', 'horse', 'hotel', 'house', 'human',
  'ideal', 'image', 'index', 'inner', 'input', 'issue', 'joint', 'judge',
  'knife', 'known', 'label', 'large', 'later', 'laugh', 'learn', 'leave',
  'level', 'light', 'limit', 'local', 'logic', 'lower', 'lucky', 'lunch',
  'magic', 'major', 'match', 'maybe', 'media', 'metal', 'might', 'minor',
  'model', 'money', 'month', 'moral', 'motor', 'mount', 'mouse', 'mouth',
  'movie', 'music', 'night', 'noise', 'north', 'noted', 'novel', 'nurse',
  'ocean', 'offer', 'often', 'order', 'other', 'ought', 'outer', 'owner',
  'paint', 'panel', 'paper', 'party', 'peace', 'phase', 'phone', 'photo',
  'piano', 'piece', 'pilot', 'pitch', 'place', 'plain', 'plane', 'plant',
  'plate', 'point', 'pound', 'power', 'press', 'price', 'pride', 'prime',
  'print', 'prize', 'proof', 'proud', 'prove', 'queen', 'quick', 'quiet',
  'quite', 'quote', 'radio', 'raise', 'range', 'rapid', 'ratio', 'reach',
  'ready', 'right', 'river', 'rough', 'round', 'route', 'royal', 'rural',
  'scale', 'scene', 'scope', 'score', 'sense', 'serve', 'seven', 'shake',
  'shall', 'shape', 'share', 'sharp', 'sheet', 'shell', 'shift', 'shirt',
  'shock', 'shoot', 'shore', 'short', 'shout', 'sight', 'since', 'sixty',
  'sleep', 'slide', 'smile', 'smoke', 'solid', 'solve', 'sorry', 'sound',
  'south', 'space', 'speak', 'speed', 'spend', 'split', 'sport', 'staff',
  'stage', 'stake', 'stand', 'start', 'state', 'steam', 'steel', 'stick',
  'still', 'stock', 'stone', 'store', 'storm', 'story', 'strip', 'stuck',
  'study', 'stuff', 'style', 'sugar', 'super', 'sweet', 'swing', 'table',
  'taste', 'teach', 'thank', 'theme', 'there', 'thick', 'thing', 'think',
  'third', 'those', 'three', 'throw', 'tight', 'tired', 'title', 'today',
  'total', 'touch', 'tough', 'tower', 'track', 'trade', 'train', 'treat',
  'trend', 'trial', 'tribe', 'trick', 'truck', 'truly', 'trunk', 'trust',
  'truth', 'twice', 'twist', 'under', 'union', 'unite', 'unity', 'until',
  'upper', 'upset', 'urban', 'usual', 'valid', 'value', 'video', 'virus',
  'visit', 'vital', 'vocal', 'voice', 'waste', 'watch', 'water', 'wheel',
  'where', 'which', 'while', 'white', 'whole', 'whose', 'woman', 'world',
  'worry', 'worse', 'worst', 'worth', 'would', 'write', 'wrong', 'wrote',
  'yield', 'young', 'youth',
  'bridge', 'change', 'charge', 'choose', 'circle', 'coffee', 'common',
  'corner', 'couple', 'create', 'custom', 'danger', 'define', 'degree',
  'demand', 'design', 'detail', 'device', 'dinner', 'direct', 'divide',
  'doctor', 'dollar', 'domain', 'double', 'during', 'easily', 'editor',
  'effect', 'effort', 'enable', 'energy', 'engine', 'enough', 'ensure',
  'entire', 'escape', 'evolve', 'except', 'expand', 'expect', 'export',
  'extend', 'factor', 'family', 'farmer', 'father', 'figure', 'finger',
  'flight', 'flower', 'follow', 'forest', 'forget', 'formal', 'former',
  'frozen', 'future', 'garden', 'gather', 'gender', 'gentle', 'global',
  'golden', 'ground', 'growth', 'guitar', 'handle', 'happen', 'heaven',
  'hidden', 'honest', 'horror', 'hunter', 'ignore', 'import', 'income',
  'indoor', 'inform', 'insect', 'inside', 'intend', 'invest', 'island',
  'jungle', 'junior', 'launch', 'leader', 'league', 'legacy', 'length',
  'lesson', 'letter', 'likely', 'linear', 'liquid', 'listen', 'little',
  'living', 'lonely', 'mainly', 'manage', 'manual', 'margin', 'market',
  'master', 'matter', 'medium', 'member', 'mental', 'method', 'middle',
  'mighty', 'minute', 'mirror', 'mobile', 'modern', 'moment', 'mother',
  'motion', 'murder', 'museum', 'mutual', 'narrow', 'nation', 'native',
  'nature', 'nearby', 'nearly', 'normal', 'notice', 'number', 'object',
  'obtain', 'occupy', 'office', 'online', 'option', 'orange', 'origin',
  'output', 'oxygen', 'palace', 'parent', 'people', 'period', 'permit',
  'person', 'phrase', 'planet', 'player', 'please', 'plenty', 'pocket',
  'poetry', 'poison', 'police', 'policy', 'prefer', 'profit', 'proper',
  'public', 'pursue', 'puzzle', 'random', 'rarely', 'rather', 'reason',
  'recall', 'record', 'reduce', 'reform', 'refuse', 'regard', 'region',
  'relate', 'remain', 'remind', 'remote', 'remove', 'repair', 'repeat',
  'report', 'resist', 'resort', 'result', 'retain', 'retire', 'return',
  'reveal', 'review', 'reward', 'rhythm', 'rocket', 'rotate', 'rubber',
  'safety', 'salary', 'sample', 'scheme', 'school', 'screen', 'script',
  'search', 'season', 'second', 'secret', 'secure', 'select', 'senior',
  'series', 'settle', 'severe', 'shadow', 'silver', 'simple', 'sister',
  'slight', 'smooth', 'social', 'source', 'speech', 'spirit', 'spread',
  'spring', 'square', 'stable', 'status', 'strain', 'stream', 'street',
  'stress', 'strict', 'strike', 'string', 'strong', 'studio', 'submit',
  'sudden', 'summer', 'supply', 'survey', 'switch', 'symbol', 'system',
  'talent', 'target', 'temple', 'tender', 'tennis', 'terror', 'thanks',
  'theory', 'thirty', 'though', 'thread', 'throne', 'timber', 'tissue',
  'tongue', 'toward', 'travel', 'treaty', 'tunnel', 'twelve', 'unfair',
  'unique', 'unless', 'unlike', 'update', 'useful', 'valley', 'vendor',
  'versus', 'victim', 'vision', 'visual', 'volume', 'wealth', 'weapon',
  'weekly', 'weight', 'winter', 'wisdom', 'wonder', 'worker', 'worthy',
  'zombie',
];
```

**What's happening:**
- The list contains 3-letter words (easy/fast), 4-5 letter words (moderate), and 6+ letter words (hard).
- All words are lowercase. We call `.toLowerCase()` when picking to be safe.
- Having hundreds of words means the player rarely sees repeats in a single session.

---

### 3. Create the Word System

**File:** `src/contexts/canvas2d/games/typing-speed/systems/WordSystem.ts`

Handles spawning new words and moving them downward each frame.

```typescript
import type { TypingState, FallingWord } from '../types';
import { INITIAL_SPAWN_INTERVAL, BASE_WORD_SPEED, FONT_SIZE } from '../types';
import { WORD_LIST } from '../data/words';

export class WordSystem {
  update(state: TypingState, dt: number): void {
    if (!state.started || state.paused || state.gameOver) return;

    // Update spawn timer
    state.spawnTimer += dt;

    // Spawn new word when timer exceeds interval
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      this.spawnWord(state);
    }

    // Move words downward
    for (const word of state.words) {
      word.y += word.speed * (dt / 1000);
    }

    // Remove words that fell off the bottom (for now just remove them)
    const margin = FONT_SIZE + 80;
    state.words = state.words.filter((w) => w.y < state.canvasHeight - margin);
  }

  spawnWord(state: TypingState): void {
    const text = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)].toLowerCase();
    const padding = 60;
    const maxX = state.canvasWidth - padding * 2;
    const x = padding + Math.random() * maxX;

    const speedVariance = 0.7 + Math.random() * 0.6;
    const speed = BASE_WORD_SPEED * speedVariance;

    const word: FallingWord = {
      text,
      x,
      y: -FONT_SIZE,
      speed,
      typed: '',
    };

    state.words.push(word);
  }
}
```

**What's happening:**
- `spawnTimer` accumulates milliseconds. When it exceeds `spawnInterval`, a new word is created and the timer resets.
- Each word spawns at `y = -FONT_SIZE` (just above the visible canvas) so it slides in smoothly.
- `speedVariance` between 0.7 and 1.3 makes some words drift slowly while others fall faster, adding visual variety.
- Words that reach the bottom are simply removed for now. In Step 4 we will deduct lives instead.

---

### 4. Create the Game Renderer

**File:** `src/contexts/canvas2d/games/typing-speed/renderers/GameRenderer.ts`

Draws the background and the falling words with color-coded difficulty.

```typescript
import type { TypingState, FallingWord } from '../types';
import { FONT_SIZE } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: TypingState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Dark background
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, W, H);

    // Subtle horizontal grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Draw falling words
    for (const word of state.words) {
      this.drawWord(ctx, word);
    }

    // Danger zone at the bottom
    const gradient = ctx.createLinearGradient(0, H - 80, 0, H);
    gradient.addColorStop(0, 'rgba(255,0,0,0)');
    gradient.addColorStop(1, 'rgba(255,0,0,0.12)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, H - 80, W, 80);

    // Danger line
    ctx.strokeStyle = 'rgba(255,60,60,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, H - 80);
    ctx.lineTo(W, H - 80);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawWord(ctx: CanvasRenderingContext2D, word: FallingWord): void {
    const len = word.text.length;
    const color = this.getWordColor(len);

    ctx.font = `bold ${FONT_SIZE}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(word.text, word.x, word.y);
  }

  private getWordColor(length: number): string {
    if (length <= 3) return '#4fc3f7'; // light blue - easy
    if (length <= 4) return '#81c784'; // green - moderate
    if (length <= 5) return '#fff176'; // yellow - medium
    if (length <= 6) return '#ffb74d'; // orange - hard
    return '#ef5350';                  // red - very hard
  }
}
```

**What's happening:**
- The background is a very dark navy (`#0a0e17`) with barely-visible grid lines for depth.
- Words are color-coded by length: blue for 3-letter (easy), up to red for 7+ letter (hard).
- The danger zone is a transparent red gradient at the bottom 80 pixels, with a dashed line marking the boundary.
- We use `monospace` font so every character has the same width, which will be important for typed-character highlighting in the next step.

---

### 5. Create the Engine

**File:** `src/contexts/canvas2d/games/typing-speed/TypingEngine.ts`

Wire the word system and renderer together with a game loop.

```typescript
import type { TypingState } from './types';
import { MAX_LIVES, INITIAL_SPAWN_INTERVAL } from './types';
import { WordSystem } from './systems/WordSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class TypingEngine {
  private ctx: CanvasRenderingContext2D;
  private state: TypingState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private wordSystem: WordSystem;
  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      words: [],
      activeWord: null,
      currentInput: '',
      score: 0,
      lives: MAX_LIVES,
      gameOver: false,
      paused: false,
      started: true,          // auto-start for this step
      totalTyped: 0,
      correctTyped: 0,
      wordsCompleted: 0,
      startTime: performance.now(),
      elapsedTime: 0,
      spawnTimer: 0,
      spawnInterval: INITIAL_SPAWN_INTERVAL,
      baseSpeed: 40,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };

    this.wordSystem = new WordSystem();
    this.gameRenderer = new GameRenderer();

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };
    window.addEventListener('resize', this.resizeHandler);

    // Spawn a couple of initial words
    this.wordSystem.spawnWord(this.state);
    this.wordSystem.spawnWord(this.state);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 100);
    this.lastTime = now;

    this.wordSystem.update(this.state, dt);
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- We set `started: true` immediately so words begin falling right away (no overlay yet).
- Two initial words are pre-spawned so the screen is not empty on load.
- The game loop calls `wordSystem.update()` then `gameRenderer.render()` every frame.
- `dt` is clamped to 100ms to prevent words from teleporting after a tab switch.

---

### 6. Create the Entry Point

**File:** `src/contexts/canvas2d/games/typing-speed/index.ts`

Export the game so the menu can launch it.

```typescript
import { TypingEngine } from './TypingEngine';

export function createTypingSpeed(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new TypingEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Typing Speed game
3. **Observe:**
   - Dark background with faint horizontal grid lines
   - Words spawn from above and drift downward at varying speeds
   - A new word appears roughly every 2 seconds
   - Words are color-coded: blue (short/easy) through red (long/hard)
   - A red danger zone glows at the bottom with a dashed line
   - Words that reach the danger zone simply disappear (for now)

---

## Challenges

**Easy:**
- Change `BASE_WORD_SPEED` to `80` and watch words fall much faster.
- Add more 3-letter words to the word bank.

**Medium:**
- Make longer words spawn slightly further from the center (spread them wider).
- Draw a faint shadow behind each word for better readability.

**Hard:**
- Make words subtly fade in during their first 10 pixels of downward travel using `globalAlpha`.

---

## What You Learned

- Designing a word bank with varied difficulty levels
- Spawning entities off-screen for smooth entry animations
- Timer-based spawning with configurable intervals
- Color-coding game objects by difficulty
- Canvas gradient overlays for danger zones
- Delta-time based downward movement

**Next:** Keyboard input and word targeting -- type to match falling words!
