import { SystemContextObject } from "../init";
import { Point, Rect } from "../rect";

export function bitmapEditorApplication(context: SystemContextObject): { draw: (mouseLocation: Point, mouseDownLocation?: Point) => void } {
    const { screen, drawer, addClickArea, screenWidth, screenHeight } = context;
    const gridWidgetLocationX = 8;
    const gridWidgetLocationY = 8;
    const gridWidth = 8;
    const gridHeight = 8;
    const tileSize = 10;
    let char = 33;
    const font: number[][] = [];

    for (let i = 0; i < 127; i++) {
        font[i] = new Array(gridHeight * gridWidth).fill(0);
    }

    function drawGrid(originX, originY, grid: number[]) {
        drawer.drawPanel(
            originX,
            originY,
            gridWidth * (tileSize +1) + 4 - 1,
            gridHeight * (tileSize +1) + 4 - 1
        );

        drawer.drawRect(
            originX + 2,
            originY + 2,
            gridWidth * (tileSize +1) -1,
            gridHeight * (tileSize +1) -1,
            4
        );

        for (let y = 0; y < gridHeight - 1; y++) {
            drawer.drawRow(
                originX + 2,
                originY + 2 + (y + 1) * (tileSize +1) - 1,
                gridWidth * (tileSize +1) -1,
                0
            )
        }
        for (let x = 0; x < gridWidth - 1; x++) {
            drawer.drawColumn(
                originX + 2 + (x + 1) * (tileSize +1) - 1,
                originY + 2,
                gridHeight * (tileSize +1) -1,
                0
            )
        }
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const index = y * gridWidth + x;
                if (grid[index]) {
                    drawer.drawRect(
                        originX + 2 + x * (tileSize +1),
                        originY + 2 + y * (tileSize +1),
                        tileSize,
                        tileSize,
                        0
                    );
                }
            }
        }
    }

    function drawSpriteFromGrid(rect: Rect, sprite: number[]) {
        const { x, y, width, height } = rect;
        for (let i = 0; i < width * height; i++) {
            const spriteX = i % width;
            const spriteY = Math.floor(i / width);
            if (sprite[i]) {
                drawer.drawPixel(x + spriteX, y + spriteY, 0);
            }
        }
    }

    function draw(mouseLocation: Point, mouseDownLocation?: Point) {
        screen.drawRect(0, 0, screenWidth, screenHeight, 5);
        drawer.drawWindow(4, 4, screenWidth - 8, screenHeight - 8);
        drawGrid(gridWidgetLocationX, gridWidgetLocationY, font[char]);
        drawSpriteFromGrid({ x: 180, y: 8, width: 8, height: 8 }, font[char]);
    }

    addClickArea(
        {
            x: gridWidgetLocationX + 2,
            y: gridWidgetLocationY + 2,
            width: gridWidth * (tileSize +1) -1,
            height: gridHeight * (tileSize +1) -1,
        },
        (location: Point) => {
            console.log("Mouse click was", location);
            const x = Math.floor(location.x / (tileSize + 1));
            const y = Math.floor(location.y / (tileSize + 1));
            const index = y * gridWidth + x;
            const charGrid = font[char];
            charGrid[index] = Number(!charGrid[index]);
        },
    );

    return { draw };
}
