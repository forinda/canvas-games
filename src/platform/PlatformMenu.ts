import type { GameCategory, GameDefinition } from '@shared/GameInterface';

interface CardLayout {
  x: number; y: number; w: number; h: number; game: GameDefinition; index: number;
}

interface TabLayout {
  x: number; y: number; w: number; h: number; key: GameCategory | 'all';
}

const CATEGORIES: { key: GameCategory | 'all'; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#a855f7' },
  { key: 'arcade', label: 'Arcade', color: '#f59e0b' },
  { key: 'action', label: 'Action', color: '#e53935' },
  { key: 'puzzle', label: 'Puzzle', color: '#00bcd4' },
  { key: 'strategy', label: 'Strategy', color: '#4caf50' },
  { key: 'chill', label: 'Chill', color: '#0288d1' },
];

const HEADER_H = 60;
const TAB_H = 36;
const CONTENT_TOP = HEADER_H + TAB_H + 8;

export class PlatformMenu {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private games: GameDefinition[] = [];
  private onSelect: (game: GameDefinition) => void;
  private rafId = 0;
  private running = false;
  private hoveredIndex = -1;
  private scrollY = 0;
  private targetScrollY = 0;
  private activeCategory: GameCategory | 'all' = 'all';
  private hoveredTab = -1;

  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;
  private wheelHandler: (e: WheelEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, onSelect: (game: GameDefinition) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    this.ctx = ctx;
    this.onSelect = onSelect;

    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    this.moveHandler = (e: MouseEvent) => this.handleMove(e);
    this.wheelHandler = (e: WheelEvent) => { e.preventDefault(); this.targetScrollY += e.deltaY * 0.5; };
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') this.targetScrollY += 60;
      if (e.key === 'ArrowUp') this.targetScrollY -= 60;
      // Number keys for category shortcuts
      const num = parseInt(e.key);
      if (num >= 1 && num <= CATEGORIES.length) {
        this.activeCategory = CATEGORIES[num - 1].key;
        this.targetScrollY = 0;
        this.scrollY = 0;
      }
    };
  }

  show(games: GameDefinition[]): void {
    this.games = games;
    this.running = true;
    this.hoveredIndex = -1;
    this.hoveredTab = -1;
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.activeCategory = 'all';
    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('mousemove', this.moveHandler);
    this.canvas.addEventListener('wheel', this.wheelHandler, { passive: false });
    window.addEventListener('keydown', this.keyHandler);
    this.loop();
  }

  hide(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('mousemove', this.moveHandler);
    this.canvas.removeEventListener('wheel', this.wheelHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private getFilteredGames(): GameDefinition[] {
    if (this.activeCategory === 'all') return this.games;
    return this.games.filter(g => g.category === this.activeCategory);
  }

  private loop(): void {
    if (!this.running) return;
    this.targetScrollY = Math.max(0, this.targetScrollY);
    this.scrollY += (this.targetScrollY - this.scrollY) * 0.15;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private getTabLayout(): TabLayout[] {
    const W = this.canvas.width;
    const tabW = Math.min(90, (W - 40) / CATEGORIES.length - 6);
    const totalW = CATEGORIES.length * (tabW + 6) - 6;
    const startX = (W - totalW) / 2;
    return CATEGORIES.map((cat, i) => ({
      x: startX + i * (tabW + 6),
      y: HEADER_H + 2,
      w: tabW,
      h: TAB_H - 4,
      key: cat.key,
    }));
  }

  private getGridLayout(): { cards: CardLayout[]; cols: number; cardW: number; cardH: number } {
    const W = this.canvas.width;
    const filtered = this.getFilteredGames();
    const gap = 16;
    const cols = Math.max(2, Math.min(5, Math.floor((W - 40) / 180)));
    const cardW = Math.min(170, (W - 40 - (cols - 1) * gap) / cols);
    const cardH = cardW * 1.15;
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = (W - totalW) / 2;

    const cards = filtered.map((game, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        x: startX + col * (cardW + gap),
        y: CONTENT_TOP + row * (cardH + gap) - this.scrollY,
        w: cardW,
        h: cardH,
        game,
        index: i,
      };
    });

    return { cards, cols, cardW, cardH };
  }

  private render(): void {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    const filtered = this.getFilteredGames();

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#1a0a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle animated grid
    const time = performance.now() * 0.0003;
    ctx.strokeStyle = 'rgba(100,60,180,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 50) {
      const offset = Math.sin(time + x * 0.01) * 4;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + offset, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Game cards (render before header so header overlaps scrolled cards)
    const { cards, cols, cardH } = this.getGridLayout();
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.y + card.h < CONTENT_TOP || card.y > H) continue;
      this.renderCard(ctx, card, i === this.hoveredIndex);
    }

    // ── Fixed header ──────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(10,10,26,0.97)';
    ctx.fillRect(0, 0, W, CONTENT_TOP);

    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleSize = Math.min(32, W * 0.04);
    ctx.font = `bold ${titleSize}px monospace`;
    ctx.fillStyle = '#a855f7';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 15;
    ctx.fillText('GAME ARCADE', W / 2, 30);
    ctx.shadowBlur = 0;

    // Game count
    ctx.font = `${Math.min(11, W * 0.015)}px monospace`;
    ctx.fillStyle = '#5a4a7a';
    ctx.fillText(`${filtered.length} of ${this.games.length} games`, W / 2, 52);

    // ── Category tabs ─────────────────────────────────────────────────
    const tabs = this.getTabLayout();
    tabs.forEach((tab, i) => {
      const cat = CATEGORIES[i];
      const isActive = this.activeCategory === cat.key;
      const isHovered = this.hoveredTab === i;
      const count = cat.key === 'all' ? this.games.length : this.games.filter(g => g.category === cat.key).length;

      // Tab background
      ctx.fillStyle = isActive ? `${cat.color}33` : isHovered ? '#1a1a2e' : '#0e0e1a';
      ctx.beginPath();
      ctx.roundRect(tab.x, tab.y, tab.w, tab.h, 6);
      ctx.fill();

      // Border
      ctx.strokeStyle = isActive ? cat.color : isHovered ? '#3a3a5e' : '#1a1a2e';
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(tab.x, tab.y, tab.w, tab.h, 6);
      ctx.stroke();

      // Label
      ctx.font = `${isActive ? 'bold ' : ''}${Math.min(11, tab.w * 0.14)}px monospace`;
      ctx.fillStyle = isActive ? cat.color : isHovered ? '#aaa' : '#555';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${cat.label} (${count})`, tab.x + tab.w / 2, tab.y + tab.h / 2);
    });

    // ── Info panel on hover ───────────────────────────────────────────
    if (this.hoveredIndex >= 0 && this.hoveredIndex < filtered.length) {
      this.renderInfoPanel(ctx, filtered[this.hoveredIndex], W, H);
    }

    // ── Scroll indicator ──────────────────────────────────────────────
    const rows = Math.ceil(filtered.length / cols);
    const totalContentH = rows * (cardH + 16) + CONTENT_TOP;
    if (totalContentH > H) {
      const maxScroll = totalContentH - H;
      this.targetScrollY = Math.min(this.targetScrollY, maxScroll);
      const scrollPct = this.scrollY / maxScroll;
      const barH = Math.max(30, (H / totalContentH) * (H - CONTENT_TOP));
      const barY = CONTENT_TOP + scrollPct * (H - CONTENT_TOP - barH);
      ctx.fillStyle = 'rgba(168,85,247,0.3)';
      ctx.beginPath();
      ctx.roundRect(W - 8, barY, 4, barH, 2);
      ctx.fill();
    }

    // Footer
    ctx.font = `${Math.min(10, W * 0.013)}px monospace`;
    ctx.fillStyle = '#1a1a2a';
    ctx.textAlign = 'center';
    ctx.fillText('[H] in-game for help  |  [1-6] category shortcuts  |  Scroll to browse', W / 2, H - 8);
  }

  private renderCard(ctx: CanvasRenderingContext2D, card: CardLayout, hovered: boolean): void {
    const { x, y, w, h, game } = card;
    const r = 12;

    if (hovered) { ctx.shadowColor = game.color; ctx.shadowBlur = 16; }

    ctx.fillStyle = hovered ? '#1a1a2e' : '#12121f';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = hovered ? game.color : '#2a2a3e';
    ctx.lineWidth = hovered ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke();
    ctx.shadowBlur = 0;

    // Category badge
    if (game.category) {
      const cat = CATEGORIES.find(c => c.key === game.category);
      if (cat) {
        ctx.font = `${Math.min(8, w * 0.05)}px monospace`;
        const badgeW = ctx.measureText(cat.label).width + 10;
        ctx.fillStyle = `${cat.color}33`;
        ctx.beginPath();
        ctx.roundRect(x + w - badgeW - 6, y + 6, badgeW, 14, 3);
        ctx.fill();
        ctx.fillStyle = cat.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cat.label, x + w - badgeW / 2 - 6, y + 13);
      }
    }

    // Icon
    ctx.font = `${Math.min(32, w * 0.26)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.icon, x + w / 2, y + h * 0.30);

    // Name
    ctx.font = `bold ${Math.min(12, w * 0.08)}px monospace`;
    ctx.fillStyle = hovered ? '#fff' : '#ccc';
    ctx.textBaseline = 'top';
    ctx.fillText(game.name, x + w / 2, y + h * 0.52);

    // Description (truncate)
    ctx.font = `${Math.min(9, w * 0.055)}px monospace`;
    ctx.fillStyle = hovered ? '#aaa' : '#555';
    const desc = game.description.length > 30 ? game.description.slice(0, 28) + '...' : game.description;
    ctx.fillText(desc, x + w / 2, y + h * 0.68);

    // Play button
    const btnH2 = 22;
    const btnW2 = w * 0.5;
    const btnX = x + (w - btnW2) / 2;
    const btnY = y + h * 0.84;
    ctx.fillStyle = hovered ? `${game.color}33` : '#1a1a1a';
    ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW2, btnH2, 5); ctx.fill();
    ctx.strokeStyle = hovered ? game.color : '#333';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW2, btnH2, 5); ctx.stroke();
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = hovered ? game.color : '#444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAY', btnX + btnW2 / 2, btnY + btnH2 / 2);
  }

  private renderInfoPanel(ctx: CanvasRenderingContext2D, game: GameDefinition, W: number, H: number): void {
    const help = game.help;
    if (!help) return;

    const panelW = Math.min(260, W * 0.28);
    const panelH = Math.min(340, H * 0.6);
    const panelX = W - panelW - 10;
    const panelY = CONTENT_TOP + 4;
    const pad = 14;
    const r = 10;

    ctx.fillStyle = 'rgba(18,18,31,0.97)';
    ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, r); ctx.fill();
    ctx.strokeStyle = game.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, r); ctx.stroke();

    let y = panelY + pad;

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = game.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${game.icon} ${game.name}`, panelX + pad, y);
    y += 24;

    ctx.font = '10px monospace';
    ctx.fillStyle = '#ccc';
    for (const line of this.wrapText(ctx, help.goal, panelW - pad * 2)) {
      ctx.fillText(line, panelX + pad, y);
      y += 14;
    }
    y += 6;

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = game.color;
    ctx.fillText('Controls', panelX + pad, y);
    y += 16;

    ctx.font = '9px monospace';
    for (const ctrl of help.controls) {
      if (y > panelY + panelH - 50) break;
      ctx.fillStyle = '#777';
      ctx.fillText(ctrl.key, panelX + pad, y);
      ctx.fillStyle = '#aaa';
      ctx.fillText(ctrl.action, panelX + pad + 100, y);
      y += 13;
    }
    y += 6;

    if (y < panelY + panelH - 30 && help.tips.length > 0) {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = game.color;
      ctx.fillText('Tips', panelX + pad, y);
      y += 16;
      ctx.font = '9px monospace';
      ctx.fillStyle = '#666';
      for (const tip of help.tips) {
        if (y > panelY + panelH - 14) break;
        for (const line of this.wrapText(ctx, `- ${tip}`, panelW - pad * 2)) {
          ctx.fillText(line, panelX + pad, y);
          y += 12;
        }
      }
    }
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxW && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCoords(e);

    // Tab clicks
    const tabs = this.getTabLayout();
    for (const tab of tabs) {
      if (x >= tab.x && x <= tab.x + tab.w && y >= tab.y && y <= tab.y + tab.h) {
        this.activeCategory = tab.key;
        this.targetScrollY = 0;
        this.scrollY = 0;
        this.hoveredIndex = -1;
        return;
      }
    }

    // Card clicks
    const { cards } = this.getGridLayout();
    for (const card of cards) {
      if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h && card.y > CONTENT_TOP) {
        this.onSelect(card.game);
        return;
      }
    }
  }

  private handleMove(e: MouseEvent): void {
    const { x, y } = this.getCoords(e);

    // Check tabs
    this.hoveredTab = -1;
    const tabs = this.getTabLayout();
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      if (x >= tab.x && x <= tab.x + tab.w && y >= tab.y && y <= tab.y + tab.h) {
        this.hoveredTab = i;
        this.canvas.style.cursor = 'pointer';
        // Don't return — still check cards below
      }
    }

    // Check cards
    this.hoveredIndex = -1;
    const { cards } = this.getGridLayout();
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h && card.y > CONTENT_TOP) {
        this.hoveredIndex = i;
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }

    if (this.hoveredTab < 0) {
      this.canvas.style.cursor = 'default';
    }
  }

  private getCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }
}
