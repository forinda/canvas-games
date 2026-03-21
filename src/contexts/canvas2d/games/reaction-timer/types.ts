export type Phase = "waiting" | "ready" | "tooEarly" | "result";

export interface AttemptResult {
	reactionMs: number;
	tooEarly: boolean;
}

export interface ReactionState {
	phase: Phase;
	/** Timestamp when the screen turned green */
	greenAt: number;
	/** Scheduled delay before turning green (ms) */
	scheduledDelay: number;
	/** Timestamp when the waiting phase started */
	waitStartedAt: number;
	/** Measured reaction time for the current round (ms) */
	reactionMs: number;
	/** All attempt results */
	attempts: AttemptResult[];
	/** Current round (1-based) */
	round: number;
	/** Whether all rounds are complete */
	finished: boolean;
	/** Best time ever from localStorage */
	bestAllTime: number;
	/** Whether help overlay is visible */
	helpVisible: boolean;
}

export const MAX_ROUNDS = 5;
export const MIN_DELAY_MS = 2000;
export const MAX_DELAY_MS = 5000;
export const LS_BEST_KEY = "reaction_timer_best";
