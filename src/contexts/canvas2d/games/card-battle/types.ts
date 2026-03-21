/** Card types available in the game */
export type CardType = "attack" | "defense" | "heal" | "special";

/** Definition of a single card */
export interface Card {
	id: number;
	name: string;
	type: CardType;
	value: number;
	cost: number;
	icon: string;
	description: string;
}

/** A card instance in a hand/deck (wraps definition with unique instance id) */
export interface CardInstance {
	uid: number;
	card: Card;
}

/** Combatant state (shared between player and enemy) */
export interface Combatant {
	name: string;
	hp: number;
	maxHp: number;
	energy: number;
	maxEnergy: number;
	block: number;
}

/** Phase of a single turn */
export type TurnPhase =
	| "draw"
	| "player"
	| "enemy"
	| "resolve"
	| "win"
	| "lose"
	| "round-win";

/** Full game state for the card battle */
export interface CardBattleState {
	player: Combatant;
	enemy: Combatant;
	deck: CardInstance[];
	hand: CardInstance[];
	discard: CardInstance[];
	playedCards: CardInstance[];
	enemyPlayedCard: Card | null;
	phase: TurnPhase;
	turn: number;
	round: number;
	maxRounds: number;
	selectedCardIndex: number;
	message: string;
	messageTimer: number;
	animTimer: number;
	gameOver: boolean;
	canvasWidth: number;
	canvasHeight: number;
	nextUid: number;
	helpVisible: boolean;
}
