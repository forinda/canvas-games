/** Input handler that can attach/detach event listeners cleanly */
export interface InputHandler {
	attach(): void;
	detach(): void;
}
