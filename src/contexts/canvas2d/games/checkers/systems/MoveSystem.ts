import type { Updatable } from "@core/Updatable";
import type { CheckersState, Piece, Cell, Move, PieceColor } from "../types";
import { BOARD_SIZE, cellsEqual, cloneBoard } from "../types";

export class MoveSystem implements Updatable<CheckersState> {
	update(state: CheckersState, _dt: number): void {
		if (!state.legalMovesDirty) return;

		state.legalMoves = this.getAllLegalMoves(
			state.board,
			state.currentTurn,
			state.mustContinueJump,
		);
		state.legalMovesDirty = false;
	}

	getAllLegalMoves(
		board: (Piece | null)[][],
		color: PieceColor,
		mustContinueFrom: Cell | null,
	): Move[] {
		const jumps: Move[] = [];
		const simple: Move[] = [];

		for (let r = 0; r < BOARD_SIZE; r++) {
			for (let c = 0; c < BOARD_SIZE; c++) {
				const piece = board[r][c];

				if (!piece || piece.color !== color) continue;

				if (
					mustContinueFrom &&
					!(mustContinueFrom.row === r && mustContinueFrom.col === c)
				)
					continue;

				const from: Cell = { row: r, col: c };
				const pieceJumps = this.getJumpMoves(board, from, piece);
				const pieceSimple = this.getSimpleMoves(board, from, piece);

				jumps.push(...pieceJumps);
				simple.push(...pieceSimple);
			}
		}

		// Forced capture rule: if any jump is available, must jump
		if (jumps.length > 0) return jumps;

		if (mustContinueFrom) return []; // mid-chain but no more jumps

		return simple;
	}

	getSimpleMoves(board: (Piece | null)[][], from: Cell, piece: Piece): Move[] {
		const moves: Move[] = [];
		const directions = this.getMoveDirections(piece);

		for (const [dr, dc] of directions) {
			const nr = from.row + dr;
			const nc = from.col + dc;

			if (this.inBounds(nr, nc) && board[nr][nc] === null) {
				moves.push({ from, to: { row: nr, col: nc }, captures: [] });
			}
		}

		return moves;
	}

	getJumpMoves(board: (Piece | null)[][], from: Cell, piece: Piece): Move[] {
		const allChains: Move[] = [];

		this.findJumpChains(board, from, from, piece, [], allChains);

		return allChains;
	}

	private findJumpChains(
		board: (Piece | null)[][],
		origin: Cell,
		current: Cell,
		piece: Piece,
		capturedSoFar: Cell[],
		results: Move[],
	): void {
		const directions = this.getMoveDirections(piece);
		let foundJump = false;

		for (const [dr, dc] of directions) {
			const midR = current.row + dr;
			const midC = current.col + dc;
			const landR = current.row + dr * 2;
			const landC = current.col + dc * 2;

			if (!this.inBounds(landR, landC)) continue;

			const midPiece = board[midR][midC];

			if (
				midPiece &&
				midPiece.color !== piece.color &&
				!capturedSoFar.some((cap) => cap.row === midR && cap.col === midC) &&
				board[landR][landC] === null
			) {
				const newCaptures = [...capturedSoFar, { row: midR, col: midC }];
				const landCell: Cell = { row: landR, col: landC };

				// Simulate the board for continued chain
				const simBoard = cloneBoard(board);

				simBoard[current.row][current.col] = null;
				simBoard[midR][midC] = null;

				// Check if piece gets kinged at landing
				const wouldKing =
					!piece.isKing &&
					((piece.color === "red" && landR === 0) ||
						(piece.color === "black" && landR === BOARD_SIZE - 1));
				const chainPiece: Piece = wouldKing
					? { color: piece.color, isKing: true }
					: piece;

				simBoard[landR][landC] = chainPiece;

				foundJump = true;

				// If piece just got kinged, stop the chain (standard rules)
				if (wouldKing) {
					results.push({ from: origin, to: landCell, captures: newCaptures });
				} else {
					// Try to continue the chain
					const beforeLen = results.length;

					this.findJumpChains(
						simBoard,
						origin,
						landCell,
						chainPiece,
						newCaptures,
						results,
					);

					// If no further jumps found, this is a terminal position
					if (results.length === beforeLen) {
						results.push({ from: origin, to: landCell, captures: newCaptures });
					}
				}
			}
		}

		if (!foundJump && capturedSoFar.length > 0) {
			// Terminal position: handled by caller adding the move
		}
	}

	private getMoveDirections(piece: Piece): [number, number][] {
		if (piece.isKing) {
			return [
				[-1, -1],
				[-1, 1],
				[1, -1],
				[1, 1],
			];
		}

		if (piece.color === "red") {
			return [
				[-1, -1],
				[-1, 1],
			]; // red moves up
		}

		return [
			[1, -1],
			[1, 1],
		]; // black moves down
	}

	private inBounds(r: number, c: number): boolean {
		return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
	}

	applyMove(state: CheckersState, move: Move): void {
		const piece = state.board[move.from.row][move.from.col];

		if (!piece) return;

		state.board[move.from.row][move.from.col] = null;

		// Remove captured pieces
		for (const cap of move.captures) {
			const captured = state.board[cap.row][cap.col];

			if (captured) {
				if (captured.color === "red") {
					state.capturedRed++;
				} else {
					state.capturedBlack++;
				}

				state.board[cap.row][cap.col] = null;
			}
		}

		state.board[move.to.row][move.to.col] = piece;
		state.lastMove = move;

		// King promotion
		if (piece.color === "red" && move.to.row === 0) {
			piece.isKing = true;
		} else if (piece.color === "black" && move.to.row === BOARD_SIZE - 1) {
			piece.isKing = true;
		}
	}

	getMovesForCell(state: CheckersState, cell: Cell): Move[] {
		return state.legalMoves.filter((m) => cellsEqual(m.from, cell));
	}
}
