import type { CardBattleState } from './types';
import { DeckSystem } from './systems/DeckSystem';
import { BattleSystem } from './systems/BattleSystem';
import { InputSystem } from './systems/InputSystem';
import { BattleRenderer } from './renderers/BattleRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { HelpOverlay } from '@shared/HelpOverlay';
import type { GameHelp } from '@shared/GameInterface';

const HELP: GameHelp = {
  goal: 'Defeat 3 increasingly difficult enemies using your card deck.',
  controls: [
    { key: 'Click Card', action: 'Play a card from your hand' },
    { key: 'End Turn',   action: 'Finish your turn' },
    { key: 'H',          action: 'Toggle help overlay' },
    { key: 'ESC',        action: 'Exit to menu' },
  ],
  tips: [
    'You draw 3 cards and get 3 energy each turn',
    'Block absorbs damage but resets each turn',
    'Special cards have unique bonus effects',
    'Save heals for when you really need them',
  ],
};

export class CardBattleEngine {
  private ctx: CanvasRenderingContext2D;
  private state: CardBattleState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private deckSystem: DeckSystem;
  private battleSystem: BattleSystem;
  private inputSystem: InputSystem;
  private battleRenderer: BattleRenderer;
  private hudRenderer: HUDRenderer;
  private helpOverlay: HelpOverlay;
  private onExit: () => void;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.onExit = onExit;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);

    this.deckSystem = new DeckSystem();
    this.battleSystem = new BattleSystem();
    this.battleRenderer = new BattleRenderer();
    this.hudRenderer = new HUDRenderer();
    this.helpOverlay = new HelpOverlay();

    this.inputSystem = new InputSystem(canvas, this.state, {
      onPlayCard: (i) => this.handlePlayCard(i),
      onEndTurn: () => this.handleEndTurn(),
      onContinue: () => this.handleContinue(),
      onRestart: () => this.handleRestart(),
      onExit: () => this.onExit(),
      onToggleHelp: () => this.toggleHelp(),
    });

    // Setup first round
    this.battleSystem.setupEnemy(this.state);
    this.deckSystem.buildDeck(this.state);
    this.startPlayerTurn();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private createInitialState(w: number, h: number): CardBattleState {
    return {
      player: {
        name: 'Hero',
        hp: 60,
        maxHp: 60,
        energy: 3,
        maxEnergy: 3,
        block: 0,
      },
      enemy: {
        name: 'Goblin',
        hp: 50,
        maxHp: 50,
        energy: 0,
        maxEnergy: 0,
        block: 0,
      },
      deck: [],
      hand: [],
      discard: [],
      playedCards: [],
      enemyPlayedCard: null,
      phase: 'draw',
      turn: 1,
      round: 1,
      maxRounds: 3,
      selectedCardIndex: -1,
      message: '',
      messageTimer: 0,
      animTimer: 0,
      gameOver: false,
      canvasWidth: w,
      canvasHeight: h,
      nextUid: 1,
      helpVisible: false,
    };
  }

  private loop(): void {
    if (!this.running) return;
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.battleSystem.update(this.state, dt);
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);
    this.battleRenderer.render(ctx, this.state);
    this.hudRenderer.render(ctx, this.state);

    if (this.state.helpVisible) {
      this.helpOverlay.show();
      this.helpOverlay.render(ctx, HELP, 'Card Battle', '#8e44ad');
    }
  }

  private startPlayerTurn(): void {
    this.state.phase = 'draw';
    this.state.player.energy = this.state.player.maxEnergy;
    this.state.player.block = 0;
    this.state.enemyPlayedCard = null;
    this.state.playedCards = [];
    this.deckSystem.drawCards(this.state, 3);
    this.state.phase = 'player';
  }

  private handlePlayCard(index: number): void {
    if (this.state.phase !== 'player') return;
    if (!this.battleSystem.canPlayCard(this.state, index)) {
      this.showMessage('Not enough energy!', 1200);
      return;
    }

    const ci = this.deckSystem.playCard(this.state, index);
    if (!ci) return;

    this.battleSystem.applyCard(this.state, ci);
    this.showMessage(`Played ${ci.card.name}!`, 800);

    // Check if enemy defeated
    this.battleSystem.checkBattleEnd(this.state);
  }

  private handleEndTurn(): void {
    if (this.state.phase !== 'player') return;

    // Discard remaining hand and played cards
    this.deckSystem.endTurnDiscard(this.state);

    // Enemy turn
    this.state.phase = 'enemy';
    this.state.enemy.block = 0;

    // Slight delay feel via immediate execution (the phase label shows 'Enemy Turn')
    this.battleSystem.enemyTurn(this.state);

    const enemyCard = this.state.enemyPlayedCard;
    if (enemyCard) {
      this.showMessage(`${this.state.enemy.name} used ${enemyCard.name}!`, 1200);
    }

    // Check battle end
    this.battleSystem.checkBattleEnd(this.state);

    if (!this.state.gameOver && (this.state.phase as string) !== 'round-win') {
      // Start next player turn
      this.state.turn++;
      this.startPlayerTurn();
    }
  }

  private handleContinue(): void {
    if (this.state.phase !== 'round-win') return;

    this.state.round++;
    this.state.turn = 1;
    this.state.phase = 'draw';
    this.state.enemyPlayedCard = null;
    this.state.message = '';

    // Heal player partially between rounds
    this.state.player.hp = Math.min(
      this.state.player.maxHp,
      this.state.player.hp + 15,
    );
    this.state.player.block = 0;

    // Setup next enemy
    this.battleSystem.setupEnemy(this.state);

    // Rebuild deck
    this.deckSystem.buildDeck(this.state);
    this.startPlayerTurn();
  }

  private handleRestart(): void {
    const w = this.state.canvasWidth;
    const h = this.state.canvasHeight;
    Object.assign(this.state, this.createInitialState(w, h));
    this.battleSystem.setupEnemy(this.state);
    this.deckSystem.buildDeck(this.state);
    this.startPlayerTurn();
  }

  private toggleHelp(): void {
    this.state.helpVisible = !this.state.helpVisible;
    if (this.state.helpVisible) {
      this.helpOverlay.show();
    } else {
      this.helpOverlay.hide();
    }
  }

  private showMessage(msg: string, durationMs: number): void {
    this.state.message = msg;
    this.state.messageTimer = durationMs;
  }
}
