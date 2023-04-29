class CanvasScreen {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private palette: string[]
  ) {}
  private color(color: number): void {
    this.ctx.fillStyle = this.palette[color];
  }
  drawPixel(x: number, y: number, color: number): void {
    this.color(color);
    this.ctx.fillRect(x, y, 1, 1);
  }
  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number
  ): void {
    this.color(color);
    this.ctx.fillRect(x, y, width, height);
  }
  drawRow(x: number, y: number, width: number, color: number): void {
    this.color(color);
    this.ctx.fillRect(x, y, width, 1);
  }
  drawColumn(x: number, y: number, height: number, color: number): void {
    this.color(color);
    this.ctx.fillRect(x, y, 1, height);
  }
  drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number
  ): void {
    this.color(color);
    this.ctx.fillRect(x, y, width, 1);
    this.ctx.fillRect(x, y + height - 1, width, 1);
    this.ctx.fillRect(x, y, 1, height);
    this.ctx.fillRect(x + width - 1, y, 1, height);
  }
}

const palette = [
  "#000000",
  "#808080", 
  "#c0c0c0",
  "#dfdfdf",
  "#FFFFFF",
  "#008080",
  "#FF0000",
  "#000080",
];

const black = 0;
const darkGray = 1;
const mediumGray = 2;
const lightGray = 3;
const white = 4;

class WindowsInterfaceDrawer extends CanvasScreen {
  public drawWindow(x: number, y: number, w: number, h: number) {
    this.drawRow(x, y, w - 1, lightGray);
    this.drawColumn(x, y, h - 1, lightGray);
    this.drawRow(x, y + h - 1, w, black);
    this.drawColumn(x + w - 1, y, h, black);
    this.drawRow(x + 1, y + 1, w - 2, white);
    this.drawColumn(x + 1, y + 1, h - 2, white);
    this.drawRow(x + 1, y + h - 2, w - 2, darkGray);
    this.drawColumn(x + w - 2, y + 1, h - 2, darkGray);
    this.drawRect(x + 2, y + 2, w - 4, h - 4, mediumGray);
  }
  public drawButton(x: number, y: number, w: number, h: number) {
    this.drawRow(x, y, w - 1, white);
    this.drawColumn(x, y, h - 1, white);
    this.drawRow(x, y + h - 1, w, black);
    this.drawColumn(x + w - 1, y, h, black);
    this.drawRow(x + 1, y + 1, w - 2, lightGray);
    this.drawColumn(x + 1, y + 1, h - 2, lightGray);
    this.drawRow(x + 1, y + h - 2, w - 2, darkGray);
    this.drawColumn(x + w - 2, y + 1, h - 2, darkGray);
    this.drawRect(x + 2, y + 2, w - 4, h - 4, mediumGray);
  }

  public drawPanel(
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    this.drawRow(x, y, w - 1, darkGray);
    this.drawColumn(x, y, h - 1, darkGray);
    this.drawRow(x, y + h - 1, w, white);
    this.drawColumn(x + w - 1, y, h, white);
    this.drawRow(x + 1, y + 1, w - 2, black);
    this.drawColumn(x + 1, y + 1, h - 2, black);
    this.drawRow(x + 1, y + h - 2, w - 2, lightGray);
    this.drawColumn(x + w - 2, y + 1, h - 2, lightGray);
    this.drawRect(x + 2, y + 2, w - 4, h - 4, white);
  }
}

function init() {
  const canvas = document.getElementById("screen") as HTMLCanvasElement;
  const SCALE_FACTOR = 4;
  const WIDTH = 320;
  const HEIGHT = 200;
  canvas.style.width = `${WIDTH * SCALE_FACTOR}px`;
  canvas.style.height = `${HEIGHT * SCALE_FACTOR}px`;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;
  const screen = new CanvasScreen(ctx, palette);

  // Background
  screen.drawRect(0, 0, WIDTH, HEIGHT, 5);

  // Draw a window
  const drawer = new WindowsInterfaceDrawer(ctx, palette);
  drawer.drawWindow(26, 26, 90, 90);
  drawer.drawRect(29, 29, 84, 18, 7);
  drawer.drawPanel(30, 50, 82, 62);
  drawer.drawButton(10, 120, 52, 22);
}

init();
