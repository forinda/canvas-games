import type { GameDefinition } from '../shared/GameInterface';

export class PlatformMenu {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private games: GameDefinition[] = [];
  private onSelect: (game: GameDefinition) => void;
  private rafId = 0;
  private running = false;
  private hoveredIndex = -1;

  // Bound handlers for cleanup
  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement, onSelect: (game: GameDefinition) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    this.ctx = ctx;
    this.onSelect = onSelect;

    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    this.moveHandler = (e: MouseEvent) => this.handleMove(e);
  }

  show(games: GameDefinition[]): void {
    this.games = games;
    this.running = true;
    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('mousemove', this.moveHandler);
    this.loop();
  }

  hide(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('mousemove', this.moveHandler);
  }

  private loop(): void {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private getCardLayout(): { cards: { x: number; y: number; w: number; h: number; game: GameDefinition }[] } {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const count = this.games.length;

    const cardW = Math.min(200, (W - 60) / count - 20);
    const cardH = cardW * 1.3;
    const gap = 20;
    const totalW = count * cardW + (count - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = H * 0.38;

    const cards = this.games.map((game, i) => ({
      x: startX + i * (cardW + gap),
      y: startY,
      w: cardW,
      h: cardH,
      game,
    }));

    return { cards };
  }

  private render(): void {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#1a0a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Animated grid
    const time = performance.now() * 0.0003;
    ctx.strokeStyle = 'rgba(100,60,180,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 50) {
      const offset = Math.sin(time + x * 0.01) * 5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + offset, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleSize = Math.min(56, W * 0.06);
    ctx.font = `bold ${titleSize}px monospace`;
    ctx.fillStyle = '#a855f7';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 25;
    ctx.fillText('GAME ARCADE', W / 2, H * 0.14);
    ctx.shadowBlur = 0;

    ctx.font = `${Math.min(16, W * 0.02)}px monospace`;
    ctx.fillStyle = '#6b5b8a';
    ctx.fillText('Choose a game to play', W / 2, H * 0.23);

    // Game cards
    const { cards } = this.getCardLayout();
    cards.forEach((card, i) => {
      this.renderCard(ctx, card, i === this.hoveredIndex);
    });

    // Footer
    ctx.font = `${Math.min(12, W * 0.015)}px monospace`;
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('Canvas Game Platform v1.0', W / 2, H - 20);
  }

  private renderCard(
    ctx: CanvasRenderingContext2D,
    card: { x: number; y: number; w: number; h: number; game: GameDefinition },
    hovered: boolean,
  ): void {
    const { x, y, w, h, game } = card;
    const r = 14;

    // Card shadow
    if (hovered) {
      ctx.shadowColor = game.color;
      ctx.shadowBlur = 20;
    }

    // Card background
    ctx.fillStyle = hovered ? '#1a1a2e' : '#12121f';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();

    // Border
    ctx.strokeStyle = hovered ? game.color : '#2a2a3e';
    ctx.lineWidth = hovered ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Icon
    const iconSize = Math.min(48, w * 0.32);
    ctx.font = `${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.icon, x + w / 2, y + h * 0.30);

    // Name
    ctx.font = `bold ${Math.min(16, w * 0.1)}px monospace`;
    ctx.fillStyle = hovered ? '#fff' : '#ccc';
    ctx.textBaseline = 'top';
    ctx.fillText(game.name, x + w / 2, y + h * 0.52);

    // Description
    ctx.font = `${Math.min(11, w * 0.065)}px monospace`;
    ctx.fillStyle = hovered ? '#aaa' : '#666';
    ctx.fillText(game.description, x + w / 2, y + h * 0.68);

    // Play button area
    const btnY = y + h * 0.80;
    const btnW = w * 0.6;
    const btnH = 28;
    const btnX = x + (w - btnW) / 2;

    ctx.fillStyle = hovered ? `${game.color}33` : '#1a1a1a';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 6);
    ctx.fill();

    ctx.strokeStyle = hovered ? game.color : '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 6);
    ctx.stroke();

    ctx.font = `bold 12px monospace`;
    ctx.fillStyle = hovered ? game.color : '#555';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAY', btnX + btnW / 2, btnY + btnH / 2);
  }

  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCoords(e);
    const { cards } = this.getCardLayout();
    for (const card of cards) {
      if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
        this.onSelect(card.game);
        return;
      }
    }
  }

  private handleMove(e: MouseEvent): void {
    const { x, y } = this.getCoords(e);
    const { cards } = this.getCardLayout();
    this.hoveredIndex = -1;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
        this.hoveredIndex = i;
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }
    this.canvas.style.cursor = 'default';
  }

  private getCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }
}
