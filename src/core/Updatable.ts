/** System that updates game logic each frame */
export interface Updatable<TState> {
	update(state: TState, dt: number): void;
}
