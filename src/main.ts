import { GameLauncher } from "@platform/GameLauncher";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;

const canvas = document.createElement("canvas");

canvas.id = "gameCanvas";
canvas.style.display = "block";
app.appendChild(canvas);

const launcher = new GameLauncher(canvas);

launcher.start();
