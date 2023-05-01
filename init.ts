import { Point, Rect, isInRect } from "./rect";
import { CanvasScreen, WindowsInterfaceDrawer } from "./screen";

const SCALE_FACTOR = 2;
const WIDTH = 320;
const HEIGHT = 200;

export interface SystemContextObject {
  screen: CanvasScreen;
  drawer: WindowsInterfaceDrawer;
  screenWidth: number;
  screenHeight: number;
  addClickArea: (
    rect: Rect,
    callback: (location: Point, absoluteLocation: Point) => void
  ) => void;
}

export type ApplicationFunction = (context: SystemContextObject) => {
  draw: (mouseLocation: Point, mouseDownLocation?: Point) => void;
};

export function init(
  canvasElementId = "screen",
  application: ApplicationFunction
) {
  const canvas = document.getElementById(canvasElementId) as HTMLCanvasElement;
  canvas.style.width = `${WIDTH * SCALE_FACTOR}px`;
  canvas.style.height = `${HEIGHT * SCALE_FACTOR}px`;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;
  const screen = new CanvasScreen(ctx);
  const drawer = new WindowsInterfaceDrawer(ctx);
  let mouseLocation = { x: 0, y: 0 };
  let mouseDownLocation: { x: number; y: number } | undefined;

  function getScreenCoordinates(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / SCALE_FACTOR);
    const y = Math.floor((event.clientY - rect.top) / SCALE_FACTOR);
    return { x, y };
  }

  const clickAreas: {
    rect: Rect;
    callback: (location: Point, absoluteLocation: Point) => void;
  }[] = [];

  function addClickArea(rect, callback) {
    clickAreas.push({ rect, callback });
  }

  const contextObject: SystemContextObject = {
    screen,
    drawer,
    addClickArea,
    screenHeight: HEIGHT,
    screenWidth: WIDTH,
  };
  const { draw: applicationDraw } = application(contextObject);

  function draw() {
    applicationDraw(mouseLocation, mouseDownLocation);
  }
  draw();

  canvas.addEventListener("mousedown", (event) => {
    mouseDownLocation = getScreenCoordinates(event);
    draw();
  });

  canvas.addEventListener("mousemove", (event) => {
    mouseLocation = getScreenCoordinates(event);
    draw();
  });

  canvas.addEventListener("mouseup", (event) => {
    if (!mouseDownLocation) {
      return;
    }

    const mouseUpLocation = getScreenCoordinates(event);
    for (const { rect, callback } of clickAreas) {
      if (
        isInRect(mouseDownLocation, rect) &&
        isInRect(mouseUpLocation, rect)
      ) {
        const relativeLocation = {
          x: mouseUpLocation.x - rect.x,
          y: mouseUpLocation.y - rect.y,
        };
        callback(relativeLocation, mouseUpLocation);
      }
    }

    mouseDownLocation = undefined;
    draw();
  });
}
