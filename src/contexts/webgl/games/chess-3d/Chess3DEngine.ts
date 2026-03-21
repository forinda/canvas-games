import type { GameInstance } from "@core/GameInterface";
import {
	createProgram,
	createBuffer,
	createVAO,
	Mat4,
	OrbitalCamera,
} from "@webgl/shared";
import { createCube, createSphere } from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import {
	BOARD_SIZE,
	CELL_SIZE,
	BOARD_Y,
	PIECE_HEIGHTS,
	createInitialBoard,
	type Chess3DState,
	type Position,
	type PieceType,
} from "./types";
import {
	getLegalMoves,
	isKingInCheck,
	hasAnyLegalMove,
	getAIMove,
} from "./chessLogic";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class Chess3DEngine implements GameInstance {
	private gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private running = false;
	private rafId = 0;

	private program: WebGLProgram;
	private cubeMesh: Mesh;
	private sphereMesh: Mesh;

	private uModel: WebGLUniformLocation;
	private uView: WebGLUniformLocation;
	private uProjection: WebGLUniformLocation;
	private uLightDir: WebGLUniformLocation;
	private uColor: WebGLUniformLocation;
	private uCameraPos: WebGLUniformLocation;
	private uEmissive: WebGLUniformLocation;
	private uAlpha: WebGLUniformLocation;

	private modelMatrix = Mat4.create();
	private projMatrix = Mat4.create();
	private camera: OrbitalCamera;

	private state: Chess3DState;
	private aiTimer = 0;

	private resizeHandler: () => void;
	private keyDownHandler: (e: KeyboardEvent) => void;
	private clickHandler: (e: MouseEvent) => void;
	private onExit: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.canvas = canvas;
		this.onExit = onExit;

		const gl = canvas.getContext("webgl2");

		if (!gl) throw new Error("WebGL2 not supported");

		this.gl = gl;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.program = createProgram(gl, VERT_SRC, FRAG_SRC);
		this.uModel = gl.getUniformLocation(this.program, "uModel")!;
		this.uView = gl.getUniformLocation(this.program, "uView")!;
		this.uProjection = gl.getUniformLocation(this.program, "uProjection")!;
		this.uLightDir = gl.getUniformLocation(this.program, "uLightDir")!;
		this.uColor = gl.getUniformLocation(this.program, "uColor")!;
		this.uCameraPos = gl.getUniformLocation(this.program, "uCameraPos")!;
		this.uEmissive = gl.getUniformLocation(this.program, "uEmissive")!;
		this.uAlpha = gl.getUniformLocation(this.program, "uAlpha")!;

		this.cubeMesh = this.buildMesh(gl, createCube(1));
		this.sphereMesh = this.buildMesh(gl, createSphere(1, 14));

		const boardCenter = (BOARD_SIZE * CELL_SIZE) / 2;

		this.camera = new OrbitalCamera(canvas, {
			distance: 12,
			elevation: 0.8,
			azimuth: 0,
			target: [boardCenter, 0, boardCenter],
			minDistance: 6,
			maxDistance: 20,
		});

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.clearColor(0.12, 0.1, 0.15, 1.0);

		this.state = this.createState();

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			gl.viewport(0, 0, canvas.width, canvas.height);
		};
		window.addEventListener("resize", this.resizeHandler);
		gl.viewport(0, 0, canvas.width, canvas.height);

		this.keyDownHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				this.onExit();
			}

			if (e.code === "KeyR") {
				this.state = this.createState();
			}
		};
		window.addEventListener("keydown", this.keyDownHandler);

		// Click to select/move pieces via ray-plane intersection
		this.clickHandler = (e: MouseEvent) => {
			if (this.state.gameOver || this.state.currentPlayer === "black") return;

			const cell = this.screenToCell(e.clientX, e.clientY);

			if (!cell) return;

			this.handleCellClick(cell);
		};
		canvas.addEventListener("click", this.clickHandler);
	}

	start(): void {
		this.running = true;
		this.loop();
	}

	destroy(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
		this.camera.dispose();
		window.removeEventListener("resize", this.resizeHandler);
		window.removeEventListener("keydown", this.keyDownHandler);
		this.canvas.removeEventListener("click", this.clickHandler);
	}

	private loop(): void {
		if (!this.running) return;

		// AI move with delay
		if (this.state.currentPlayer === "black" && !this.state.gameOver) {
			this.aiTimer += 1 / 60;

			if (this.aiTimer > 0.5) {
				this.aiTimer = 0;
				this.doAIMove();
			}
		}

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private createState(): Chess3DState {
		this.aiTimer = 0;

		return {
			board: createInitialBoard(),
			currentPlayer: "white",
			selectedPos: null,
			legalMoves: [],
			lastMove: null,
			isCheck: false,
			isCheckmate: false,
			isStalemate: false,
			gameOver: false,
			phase: "playing",
		};
	}

	private handleCellClick(pos: Position): void {
		const s = this.state;
		const piece = s.board[pos.row][pos.col];

		// If a piece is selected and this is a legal move target
		if (s.selectedPos) {
			const isLegal = s.legalMoves.some(
				(m) => m.row === pos.row && m.col === pos.col,
			);

			if (isLegal) {
				this.makeMove(s.selectedPos, pos);
				s.selectedPos = null;
				s.legalMoves = [];

				return;
			}
		}

		// Select a piece
		if (piece && piece.color === s.currentPlayer) {
			s.selectedPos = pos;
			s.legalMoves = getLegalMoves(s.board, pos, s.currentPlayer);
		} else {
			s.selectedPos = null;
			s.legalMoves = [];
		}
	}

	private makeMove(from: Position, to: Position): void {
		const s = this.state;

		// Auto-promote pawns to queen
		const piece = s.board[from.row][from.col]!;

		s.board[to.row][to.col] = piece;
		s.board[from.row][from.col] = null;

		if (piece.type === "pawn" && (to.row === 0 || to.row === 7)) {
			s.board[to.row][to.col] = { type: "queen", color: piece.color };
		}

		s.lastMove = { from, to };

		// Switch player
		s.currentPlayer = s.currentPlayer === "white" ? "black" : "white";

		// Check game state
		s.isCheck = isKingInCheck(s.board, s.currentPlayer);
		const hasMove = hasAnyLegalMove(s.board, s.currentPlayer);

		if (!hasMove) {
			s.gameOver = true;
			s.phase = "gameover";

			if (s.isCheck) {
				s.isCheckmate = true;
			} else {
				s.isStalemate = true;
			}
		}
	}

	private doAIMove(): void {
		const s = this.state;
		const move = getAIMove(s.board, "black");

		if (move) {
			this.makeMove(move.from, move.to);
		}

		s.selectedPos = null;
		s.legalMoves = [];
	}

	// ── Screen → cell mapping (ray-plane intersection) ───────────────────

	private screenToCell(screenX: number, screenY: number): Position | null {
		const { canvas } = this;
		// NDC
		const rect = canvas.getBoundingClientRect();
		const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
		const ndcY = -(((screenY - rect.top) / rect.height) * 2 - 1);

		// Inverse VP matrix
		const aspect = canvas.width / canvas.height;
		const vp = Mat4.create();

		Mat4.perspective(vp, Math.PI / 4, aspect, 0.1, 200);
		Mat4.multiply(vp, vp, this.camera.getViewMatrix());

		const invVP = Mat4.create();

		Mat4.invert(invVP, vp);

		// Ray origin and direction in world space
		const nearW = this.transformPoint(invVP, ndcX, ndcY, -1);
		const farW = this.transformPoint(invVP, ndcX, ndcY, 1);

		const dirX = farW[0] - nearW[0];
		const dirY = farW[1] - nearW[1];
		const dirZ = farW[2] - nearW[2];

		// Intersect with Y = BOARD_Y + 0.1 plane
		const planeY = BOARD_Y + 0.1;

		if (Math.abs(dirY) < 0.0001) return null;

		const t = (planeY - nearW[1]) / dirY;

		if (t < 0) return null;

		const hitX = nearW[0] + dirX * t;
		const hitZ = nearW[2] + dirZ * t;

		const col = Math.floor(hitX / CELL_SIZE);
		const row = Math.floor(hitZ / CELL_SIZE);

		if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE)
			return null;

		return { row, col };
	}

	private transformPoint(
		mat: Float32Array,
		x: number,
		y: number,
		z: number,
	): [number, number, number] {
		const w = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];

		return [
			(mat[0] * x + mat[4] * y + mat[8] * z + mat[12]) / w,
			(mat[1] * x + mat[5] * y + mat[9] * z + mat[13]) / w,
			(mat[2] * x + mat[6] * y + mat[10] * z + mat[14]) / w,
		];
	}

	// ── Render ───────────────────────────────────────────────────────────

	private render(): void {
		const { gl, canvas, state: s } = this;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 200);

		const viewMatrix = this.camera.getViewMatrix();
		const camPos = this.camera.getPosition();

		gl.uniformMatrix4fv(this.uView, false, viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.3, 0.8, 0.4);
		gl.uniform3f(this.uCameraPos, camPos[0], camPos[1], camPos[2]);
		gl.uniform1f(this.uEmissive, 0.0);
		gl.uniform1f(this.uAlpha, 1.0);

		// ── Board ────────────────────────────────────────────────────
		for (let r = 0; r < BOARD_SIZE; r++) {
			for (let c = 0; c < BOARD_SIZE; c++) {
				const cx = c * CELL_SIZE + CELL_SIZE / 2;
				const cz = r * CELL_SIZE + CELL_SIZE / 2;
				const isLight = (r + c) % 2 === 0;

				let cr = isLight ? 0.82 : 0.35;
				let cg = isLight ? 0.72 : 0.25;
				let cb = isLight ? 0.55 : 0.2;

				// Highlight selected
				if (
					s.selectedPos &&
					s.selectedPos.row === r &&
					s.selectedPos.col === c
				) {
					cr = 0.9;
					cg = 0.85;
					cb = 0.3;
				}

				// Highlight legal moves
				const isLegal = s.legalMoves.some((m) => m.row === r && m.col === c);

				if (isLegal) {
					cr = 0.3;
					cg = 0.7;
					cb = 0.3;
				}

				// Highlight last move
				if (s.lastMove) {
					if (
						(s.lastMove.from.row === r && s.lastMove.from.col === c) ||
						(s.lastMove.to.row === r && s.lastMove.to.col === c)
					) {
						cr = Math.min(1, cr + 0.15);
						cg = Math.min(1, cg + 0.2);
						cb = Math.min(1, cb + 0.05);
					}
				}

				this.drawBox(
					cx,
					BOARD_Y - 0.05,
					cz,
					(CELL_SIZE / 2) * 0.98,
					0.05,
					(CELL_SIZE / 2) * 0.98,
					cr,
					cg,
					cb,
				);
			}
		}

		// Board border
		const boardExtent = BOARD_SIZE * CELL_SIZE;
		const mid = boardExtent / 2;

		this.drawBox(
			mid,
			BOARD_Y - 0.15,
			mid,
			mid + 0.15,
			0.1,
			mid + 0.15,
			0.2,
			0.15,
			0.1,
		);

		// ── Pieces ───────────────────────────────────────────────────
		for (let r = 0; r < BOARD_SIZE; r++) {
			for (let c = 0; c < BOARD_SIZE; c++) {
				const piece = s.board[r][c];

				if (!piece) continue;

				const cx = c * CELL_SIZE + CELL_SIZE / 2;
				const cz = r * CELL_SIZE + CELL_SIZE / 2;

				this.renderPiece(piece.type, piece.color, cx, cz);
			}
		}
	}

	private renderPiece(
		type: PieceType,
		color: string,
		x: number,
		z: number,
	): void {
		const { gl } = this;
		const isWhite = color === "white";
		const r = isWhite ? 0.9 : 0.15;
		const g = isWhite ? 0.88 : 0.12;
		const b = isWhite ? 0.82 : 0.1;
		const h = PIECE_HEIGHTS[type];

		// Base (flat cylinder approximated by a wide short cube)
		this.drawBox(
			x,
			BOARD_Y + 0.08,
			z,
			0.25,
			0.08,
			0.25,
			r * 0.8,
			g * 0.8,
			b * 0.8,
		);

		// Body (cube)
		const bodyW = type === "pawn" ? 0.15 : type === "knight" ? 0.18 : 0.2;

		this.drawBox(x, BOARD_Y + h / 2 + 0.08, z, bodyW, h / 2, bodyW, r, g, b);

		// Top — different per piece type
		const topY = BOARD_Y + h + 0.08;

		switch (type) {
			case "pawn":
				// Small sphere on top
				this.drawSphere(x, topY + 0.1, z, 0.12, r, g, b);
				break;
			case "rook":
				// Battlements (small cube on top)
				this.drawBox(x, topY + 0.06, z, 0.22, 0.06, 0.22, r, g, b);
				this.drawBox(x - 0.14, topY + 0.14, z, 0.05, 0.05, 0.05, r, g, b);
				this.drawBox(x + 0.14, topY + 0.14, z, 0.05, 0.05, 0.05, r, g, b);
				this.drawBox(x, topY + 0.14, z - 0.14, 0.05, 0.05, 0.05, r, g, b);
				this.drawBox(x, topY + 0.14, z + 0.14, 0.05, 0.05, 0.05, r, g, b);
				break;
			case "knight":
				// Angled head
				this.drawBox(x + 0.08, topY + 0.12, z, 0.15, 0.12, 0.12, r, g, b);
				this.drawSphere(
					x + 0.18,
					topY + 0.18,
					z,
					0.08,
					r * 0.9,
					g * 0.9,
					b * 0.9,
				);
				break;
			case "bishop":
				// Pointed top
				this.drawSphere(x, topY + 0.08, z, 0.15, r, g, b);
				this.drawSphere(x, topY + 0.22, z, 0.06, r, g, b);
				break;
			case "queen":
				// Crown-like sphere cluster
				this.drawSphere(x, topY + 0.1, z, 0.18, r, g, b);
				gl.uniform1f(this.uEmissive, 0.4);
				this.drawSphere(x, topY + 0.26, z, 0.08, 0.9, 0.2, 0.2);
				gl.uniform1f(this.uEmissive, 0.0);
				break;
			case "king":
				// Cross on top
				this.drawSphere(x, topY + 0.1, z, 0.18, r, g, b);
				this.drawBox(x, topY + 0.28, z, 0.04, 0.12, 0.04, r, g, b);
				this.drawBox(x, topY + 0.32, z, 0.1, 0.04, 0.04, r, g, b);
				break;
		}
	}

	private drawBox(
		x: number,
		y: number,
		z: number,
		sx: number,
		sy: number,
		sz: number,
		r: number,
		g: number,
		b: number,
	): void {
		const { gl } = this;

		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
		Mat4.scale(this.modelMatrix, this.modelMatrix, [sx, sy, sz]);
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, r, g, b);
		this.drawMesh(this.cubeMesh);
	}

	private drawSphere(
		x: number,
		y: number,
		z: number,
		radius: number,
		r: number,
		g: number,
		b: number,
	): void {
		const { gl } = this;

		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
		Mat4.scale(this.modelMatrix, this.modelMatrix, [radius, radius, radius]);
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, r, g, b);
		this.drawMesh(this.sphereMesh);
	}

	private buildMesh(gl: WebGL2RenderingContext, data: PrimitiveData): Mesh {
		const vao = createVAO(gl);

		gl.bindVertexArray(vao);

		const posBuf = createBuffer(gl, data.positions);

		gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		const normBuf = createBuffer(gl, data.normals);

		gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

		const idxBuf = createBuffer(gl, data.indices, gl.ELEMENT_ARRAY_BUFFER);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
		gl.bindVertexArray(null);

		return { vao, indexCount: data.indices.length };
	}

	private drawMesh(mesh: Mesh): void {
		this.gl.bindVertexArray(mesh.vao);
		this.gl.drawElements(
			this.gl.TRIANGLES,
			mesh.indexCount,
			this.gl.UNSIGNED_SHORT,
			0,
		);
	}
}
