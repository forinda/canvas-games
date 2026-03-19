import type { Updatable } from "@shared/Updatable";
import type { CardBattleState, CardInstance } from "../types";
import { CARD_DEFINITIONS } from "../data/cards";

/** Manages draw pile, hand, and discard pile */
export class DeckSystem implements Updatable<CardBattleState> {
	/** Build a fresh deck of CardInstances from the master definitions */
	buildDeck(state: CardBattleState): void {
		state.deck = [];

		for (const card of CARD_DEFINITIONS) {
			state.deck.push({ uid: state.nextUid++, card });
		}

		this.shuffle(state.deck);
		state.hand = [];
		state.discard = [];
		state.playedCards = [];
	}

	/** Fisher-Yates shuffle */
	shuffle(arr: CardInstance[]): void {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));

			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
	}

	/** Draw n cards from the deck into the hand */
	drawCards(state: CardBattleState, count: number): void {
		for (let i = 0; i < count; i++) {
			if (state.deck.length === 0) {
				this.reshuffleDiscard(state);
			}

			if (state.deck.length === 0) break;

			const card = state.deck.pop()!;

			state.hand.push(card);
		}
	}

	/** Move discard pile back into the deck and shuffle */
	reshuffleDiscard(state: CardBattleState): void {
		state.deck.push(...state.discard);
		state.discard = [];
		this.shuffle(state.deck);
	}

	/** Move a card from hand to played area */
	playCard(state: CardBattleState, handIndex: number): CardInstance | null {
		if (handIndex < 0 || handIndex >= state.hand.length) return null;

		const [card] = state.hand.splice(handIndex, 1);

		state.playedCards.push(card);

		return card;
	}

	/** Discard all played cards and remaining hand at end of turn */
	endTurnDiscard(state: CardBattleState): void {
		state.discard.push(...state.playedCards);
		state.discard.push(...state.hand);
		state.playedCards = [];
		state.hand = [];
	}

	update(_state: CardBattleState, _dt: number): void {
		// Deck system is event-driven, not tick-driven
	}
}
