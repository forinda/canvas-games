import type { Updatable } from "@shared/Updatable";
import type { TypingState, FallingWord } from "../types";
import {
	INITIAL_SPAWN_INTERVAL,
	MIN_SPAWN_INTERVAL,
	BASE_WORD_SPEED,
	SPEED_INCREMENT,
	FONT_SIZE,
} from "../types";
import { WORD_LIST } from "../data/words";

export class WordSystem implements Updatable<TypingState> {
	update(state: TypingState, dt: number): void {
		if (!state.started || state.paused || state.gameOver) return;

		// Update spawn timer
		state.spawnTimer += dt;

		// Decrease spawn interval over time
		const elapsed = state.elapsedTime / 1000;

		state.spawnInterval = Math.max(
			MIN_SPAWN_INTERVAL,
			INITIAL_SPAWN_INTERVAL - elapsed * 15,
		);

		// Spawn new word
		if (state.spawnTimer >= state.spawnInterval) {
			state.spawnTimer = 0;
			this.spawnWord(state);
		}

		// Move words downward
		const speedMultiplier = 1 + elapsed * SPEED_INCREMENT;

		for (const word of state.words) {
			word.y += word.speed * speedMultiplier * (dt / 1000);
		}

		// Check for words reaching the bottom
		const margin = FONT_SIZE + 80;
		const fallen: FallingWord[] = [];
		const remaining: FallingWord[] = [];

		for (const word of state.words) {
			if (word.y >= state.canvasHeight - margin) {
				fallen.push(word);
			} else {
				remaining.push(word);
			}
		}

		for (const word of fallen) {
			state.lives -= 1;

			if (word === state.activeWord) {
				state.activeWord = null;
				state.currentInput = "";
			}
		}

		state.words = remaining;

		if (state.lives <= 0) {
			state.lives = 0;
			state.gameOver = true;
		}
	}

	spawnWord(state: TypingState): void {
		const text =
			WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)].toLowerCase();
		const padding = 60;
		const maxX = state.canvasWidth - padding * 2;
		const x = padding + Math.random() * maxX;

		const elapsed = state.elapsedTime / 1000;
		const speedVariance = 0.7 + Math.random() * 0.6;
		const speed = (BASE_WORD_SPEED + elapsed * 0.5) * speedVariance;

		const word: FallingWord = {
			text,
			x,
			y: -FONT_SIZE,
			speed,
			typed: "",
		};

		state.words.push(word);
	}
}
