import { HEIGHT, WIDTH } from "./init";
import { Point } from "./rect";
import { Widget, WidgetEvent } from "./widget";

export class Manager {
  private applicationWidget: Widget;
  private mouseLocation: Point = { x: 0, y: 0 };
  private previousMouseLocation: Point = { x: 0, y: 0 };
  private mousePressed = false;

  getMousePressed(): boolean {
    return this.mousePressed;
  }

  getMouseLocation(): Point {
    return this.mouseLocation;
  }
  getPreviousMouseLocation(): Point {
    return this.previousMouseLocation;
  }

  getScreenRect() {
    return { x: 0, y: 0, width: WIDTH, height: HEIGHT };
  }

  setApplicationWidget(widget: Widget) {
    this.applicationWidget = widget;
  }

  emitEvent(event: WidgetEvent) {
    console.log("Manager emitting event");
    if (event.type === "mouse" && event.event === "move") {
      this.previousMouseLocation = this.mouseLocation;
      this.mouseLocation = event.location;
    }

    else if (event.type === "mouse" && event.event === "up") {
      this.mousePressed = false;
    } else if (event.type === "mouse" && event.event === "down") {
      this.mousePressed = true;
    }

    this.applicationWidget.delegateEvent(event);
  }
}
