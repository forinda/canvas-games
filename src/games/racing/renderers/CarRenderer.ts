import type { Renderable } from "@shared/Renderable";
import type { RacingState, Car } from "../types";
import { CAR_LENGTH, CAR_WIDTH } from "../types";

export class CarRenderer implements Renderable<RacingState> {
	render(ctx: CanvasRenderingContext2D, state: RacingState): void {
		const { cameraX, cameraY, canvasW, canvasH } = state;

		ctx.save();
		ctx.translate(-cameraX + canvasW / 2, -cameraY + canvasH / 2);

		// Draw skid marks first (under cars)
		const allCars = [state.player, ...state.aiCars];

		for (const car of allCars) {
			this.renderSkidMarks(ctx, car);
		}

		// Draw AI cars
		for (const car of state.aiCars) {
			this.renderCar(ctx, car);
		}

		// Draw player on top
		this.renderCar(ctx, state.player);

		ctx.restore();
	}

	private renderSkidMarks(ctx: CanvasRenderingContext2D, car: Car): void {
		for (const mark of car.skidMarks) {
			ctx.fillStyle = `rgba(40,40,40,${mark.alpha})`;
			ctx.beginPath();
			ctx.arc(mark.x, mark.y, 3, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private renderCar(ctx: CanvasRenderingContext2D, car: Car): void {
		ctx.save();
		ctx.translate(car.x, car.y);
		ctx.rotate(car.angle);

		// Car body
		ctx.fillStyle = car.color;
		ctx.fillRect(-CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH);

		// Car windshield (front portion)
		ctx.fillStyle = "rgba(150,220,255,0.6)";
		ctx.fillRect(CAR_LENGTH / 2 - 8, -CAR_WIDTH / 2 + 2, 6, CAR_WIDTH - 4);

		// Car outline
		ctx.strokeStyle = "rgba(0,0,0,0.5)";
		ctx.lineWidth = 1.5;
		ctx.strokeRect(-CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH);

		// Headlights
		ctx.fillStyle = "#ffee88";
		ctx.fillRect(CAR_LENGTH / 2 - 2, -CAR_WIDTH / 2 + 1, 3, 3);
		ctx.fillRect(CAR_LENGTH / 2 - 2, CAR_WIDTH / 2 - 4, 3, 3);

		// Taillights
		ctx.fillStyle = "#ff3333";
		ctx.fillRect(-CAR_LENGTH / 2 - 1, -CAR_WIDTH / 2 + 1, 3, 3);
		ctx.fillRect(-CAR_LENGTH / 2 - 1, CAR_WIDTH / 2 - 4, 3, 3);

		ctx.restore();

		// Name label
		ctx.font = "bold 10px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillText(car.name, car.x, car.y - CAR_WIDTH / 2 - 4);
	}
}
