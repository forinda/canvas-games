/** Component that draws to the canvas */
export interface Renderable<TState> {
	render(ctx: CanvasRenderingContext2D, state: TState): void;
}
