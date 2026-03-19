import type { CheckersState } from "./types";
import { createInitialState, cloneBoard } from "./types";
import { MoveSystem } from "./systems/MoveSystem";
import { GameSystem } from "./systems/GameSystem";
import { AISystem } from "./systems/AISystem";
import { InputSystem } from "./systems/InputSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export class CheckersEngine {
	private ctx: CanvasRenderingContext2D;
	private state: CheckersState;
	private running: boolean;
	private rafId: number;

	private moveSystem: MoveSystem;
	private gameSystem: GameSystem;
	private aiSystem: AISystem;
	private inputSystem: InputSystem;
	private boardRenderer: BoardRenderer;
	private hudRenderer: HUDRenderer;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		this.running = false;
		this.rafId = 0;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.state = createInitialState();

		// Systems
		this.moveSystem = new MoveSystem();
		this.gameSystem = new GameSystem(this.moveSystem);
		this.aiSystem = new AISystem(this.moveSystem);

		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			onExit,
			() => this.reset(),
			this.moveSystem,
			this.gameSystem,
			() => this.onMoveComplete(),
		);

		// Renderers
		this.boardRenderer = new BoardRenderer();
		this.hudRenderer = new HUDRenderer();

		// Resize handler
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};

		// Initialize legal moves
		this.state.legalMovesDirty = true;
		this.moveSystem.update(this.state, 0);

		// Attach listeners
		this.inputSystem.attach();
		window.addEventListener("resize", this.resizeHandler);
	}

	start(): void {
		this.running = true;
		this.loop();
	}

	destroy(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
		this.inputSystem.detach();
		window.removeEventListener("resize", this.resizeHandler);
	}

	private loop(): void {
		if (!this.running) return;

		this.update();
		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private update(): void {
		if (!this.state.started || this.state.showModeSelector) return;

		this.moveSystem.update(this.state, 0);
		this.gameSystem.update(this.state, 0);

		// AI turn
		if (
			this.state.mode === "ai" &&
			this.state.currentTurn === "black" &&
			!this.state.gameOver &&
			!this.state.aiThinking
		) {
			this.triggerAI();
		}
	}

	private render(): void {
		this.boardRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
	}

	private onMoveComplete(): void {
		// Recalculate legal moves after a move
		this.state.legalMovesDirty = true;
		this.moveSystem.update(this.state, 0);
		this.gameSystem.update(this.state, 0);
	}

	private triggerAI(): void {
		this.state.aiThinking = true;

		// Use setTimeout to avoid blocking the render loop
		setTimeout(() => {
			if (!this.running || this.state.gameOver) {
				this.state.aiThinking = false;

				return;
			}

			const s = this.state;
			const move = this.aiSystem.getBestMove(s);

			if (move) {
				// Push snapshot to history before applying the move
				s.moveHistory.push({
					board: cloneBoard(s.board),
					currentTurn: s.currentTurn,
					capturedRed: s.capturedRed,
					capturedBlack: s.capturedBlack,
					mustContinueJump: s.mustContinueJump,
					lastMove: s.lastMove,
				});

				this.moveSystem.applyMove(s, move);
				s.mustContinueJump = null;

				// Check for multi-jump continuation
				if (move.captures.length > 0) {
					const continuationJumps = this.moveSystem.getJumpMoves(
						s.board,
						move.to,
						s.board[move.to.row][move.to.col]!,
					);

					if (continuationJumps.length > 0) {
						s.mustContinueJump = move.to;
						s.legalMovesDirty = true;
						this.moveSystem.update(s, 0);
						// Keep AI thinking — schedule another AI move
						this.state.aiThinking = false;

						return;
					}
				}

				this.gameSystem.switchTurn(s);
				s.legalMovesDirty = true;
				this.moveSystem.update(s, 0);
				this.gameSystem.update(s, 0);
			}

			this.state.aiThinking = false;
		}, 300);
	}

	private reset(): void {
		const mode = this.state.mode;
		const newState = createInitialState();

		newState.mode = mode;
		newState.showModeSelector = false;
		newState.started = true;

		// Copy new state properties
		Object.assign(this.state, newState);
		this.moveSystem.update(this.state, 0);
	}
}
