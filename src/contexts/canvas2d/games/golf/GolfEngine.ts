import type { GolfState } from "./types";
import {
	BALL_RADIUS,
	COURSE_WIDTH,
	COURSE_HEIGHT,
	SUNK_DISPLAY_TIME,
	POWER_SCALE,
	MAX_POWER,
} from "./types";
import { COURSES } from "./data/courses";
import { InputSystem } from "./systems/InputSystem";
import { PhysicsSystem } from "./systems/PhysicsSystem";
import { CourseSystem } from "./systems/CourseSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import type { GameHelp } from "@core/GameInterface";
import { HelpOverlay } from "@shared/HelpOverlay";

const GOLF_HELP: GameHelp = {
	goal: "Complete all 9 holes in as few strokes as possible.",
	controls: [
		{ key: "Click + Drag", action: "Aim and set power (drag away from ball)" },
		{ key: "Release", action: "Putt the ball" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "R", action: "Restart game" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Drag further from the ball for more power",
		"The aim line shows shot direction (opposite of drag)",
		"Green arrows on the course indicate slope direction",
		"The ball must slow down near the hole to sink",
		"Aim for par or under on each hole for the best score",
	],
};

export class GolfEngine {
	private ctx: CanvasRenderingContext2D;
	private state: GolfState;
	private running: boolean;
	private rafId: number;

	private inputSystem: InputSystem;
	private physicsSystem: PhysicsSystem;
	private courseSystem: CourseSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		this.running = false;
		this.rafId = 0;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const offsetX = Math.floor((canvas.width - COURSE_WIDTH) / 2);
		const offsetY = Math.floor((canvas.height - COURSE_HEIGHT) / 2);

		this.state = {
			ball: {
				pos: { x: 0, y: 0 },
				vel: { x: 0, y: 0 },
				radius: BALL_RADIUS,
			},
			currentHole: 0,
			totalHoles: COURSES.length,
			strokes: 0,
			strokesPerHole: new Array(COURSES.length).fill(0),
			parPerHole: new Array(COURSES.length).fill(0),
			totalScore: 0,
			aiming: false,
			aimStart: null,
			aimEnd: null,
			ballMoving: false,
			holeSunk: false,
			sunkTimer: 0,
			gameComplete: false,
			paused: false,
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			courseOffsetX: offsetX,
			courseOffsetY: offsetY,
			courseWidth: COURSE_WIDTH,
			courseHeight: COURSE_HEIGHT,
			showHelp: false,
		};

		this.physicsSystem = new PhysicsSystem();
		this.courseSystem = new CourseSystem();
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		this.inputSystem = new InputSystem(
			canvas,
			this.state,
			onExit,
			() => this.reset(),
			(power: number, angle: number) => this.putt(power, angle),
		);

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.canvasWidth = canvas.width;
			this.state.canvasHeight = canvas.height;
			this.state.courseOffsetX = Math.floor((canvas.width - COURSE_WIDTH) / 2);
			this.state.courseOffsetY = Math.floor(
				(canvas.height - COURSE_HEIGHT) / 2,
			);
		};

		// Load first hole
		this.courseSystem.loadHole(this.state);
	}

	private putt(power: number, angle: number): void {
		const s = this.state;

		if (s.ballMoving || s.holeSunk || s.gameComplete) return;

		const scaledPower = Math.min(power * POWER_SCALE, MAX_POWER);

		s.ball.vel.x = Math.cos(angle) * scaledPower;
		s.ball.vel.y = Math.sin(angle) * scaledPower;
		s.ballMoving = true;

		this.courseSystem.recordStroke(s);
	}

	private reset(): void {
		this.state.currentHole = 0;
		this.state.totalScore = 0;
		this.state.strokesPerHole = new Array(COURSES.length).fill(0);
		this.state.parPerHole = new Array(COURSES.length).fill(0);
		this.state.gameComplete = false;
		this.state.holeSunk = false;
		this.state.showHelp = false;
		this.courseSystem.loadHole(this.state);
	}

	start(): void {
		this.running = true;
		this.inputSystem.attach();
		window.addEventListener("resize", this.resizeHandler);
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

		this.tick();
		this.render();

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private tick(): void {
		const s = this.state;

		if (s.showHelp || s.gameComplete) return;

		// Physics update
		if (s.ballMoving) {
			this.physicsSystem.update(s, 16);
		}

		// Handle sunk transition
		if (s.holeSunk) {
			const elapsed = performance.now() - s.sunkTimer;

			if (elapsed > SUNK_DISPLAY_TIME) {
				this.courseSystem.advanceHole(s);
			}
		}
	}

	private render(): void {
		const ctx = this.ctx;

		this.gameRenderer.render(ctx, this.state);
		this.hudRenderer.render(ctx, this.state);

		if (this.state.showHelp) {
			this.helpOverlay.visible = true;
			this.helpOverlay.render(ctx, GOLF_HELP, "Golf", "#388e3c");
		} else {
			this.helpOverlay.visible = false;
		}
	}
}
