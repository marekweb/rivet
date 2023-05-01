export class CanvasScreen {
  constructor(private ctx: CanvasRenderingContext2D) {}
  private color(color: number): void {
    this.ctx.fillStyle = palette[color];
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
  
  drawDitheredRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    color2: number
  ): void {
    this.color(color);
    this.ctx.fillRect(x, y, width, height);
    this.color(color2);
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        if ((i + j) % 2 === 0) {
          this.drawPixel(x + i, y + j, color2);
        }
      }
    }
  }
}

export const palette = [
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

export class WindowsInterfaceDrawer extends CanvasScreen {
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

  public drawButtonPressed(x: number, y: number, w: number, h: number) {
    this.drawRow(x, y, w - 1, black);
    this.drawColumn(x, y, h - 1, black);
    this.drawRow(x, y + h - 1, w, white);
    this.drawColumn(x + w - 1, y, h, white);
    this.drawRow(x + 1, y + 1, w - 2, darkGray);
    this.drawColumn(x + 1, y + 1, h - 2, darkGray);
    this.drawRow(x + 1, y + h - 2, w - 2, lightGray);
    this.drawColumn(x + w - 2, y + 1, h - 2, lightGray);
    this.drawRect(x + 2, y + 2, w - 4, h - 4, mediumGray);
  }

  public drawPanel(
    x: number,
    y: number,
    w: number,
    h: number,
    backgroundColor?: number
  ) {
    this.drawRow(x, y, w - 1, darkGray);
    this.drawColumn(x, y, h - 1, darkGray);
    this.drawRow(x, y + h - 1, w, white);
    this.drawColumn(x + w - 1, y, h, white);
    this.drawRow(x + 1, y + 1, w - 2, black);
    this.drawColumn(x + 1, y + 1, h - 2, black);
    this.drawRow(x + 1, y + h - 2, w - 2, lightGray);
    this.drawColumn(x + w - 2, y + 1, h - 2, lightGray);
    if (backgroundColor !== undefined) {
      this.drawRect(x + 2, y + 2, w - 4, h - 4, white);
    }
  }
}
