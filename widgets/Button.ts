import type { Manager } from "../manager";
import type { Rect } from "../rect";
import { isInRect } from "../rect";
import type { WindowsInterfaceDrawer } from "../screen";
import BaseWidget from "./BaseWidget";
import type Widget from "./Widget";
import type { WidgetEvent } from "./Widget";

export default class Button extends BaseWidget implements Widget {
  protected pressed = false;
  public disabled = false;
  protected clickHandler: () => void;
  private mouseDownInside = false;

  constructor(manager: Manager, rect: Rect, clickHandler: () => void) {
    super(manager, rect);
    this.clickHandler = clickHandler;
  }

  handleEvent(event: WidgetEvent): void {
    if (this.disabled) {
      return;
    }

    if (event.type !== "mouse") {
      return;
    }

    const localRect = {
      x: 0,
      y: 0,
      width: this.rect.width,
      height: this.rect.height,
    };
    const mouseInside = isInRect(event.location, localRect);

    if (event.event === "down") {
      // Mouse down inside button - request capture and track state
      this.mouseDownInside = true;
      this.pressed = true;
      this.manager.requestCapture(this);
    } else if (event.event === "move") {
      // While captured, update pressed state based on whether mouse is inside
      if (this.mouseDownInside) {
        this.pressed = mouseInside;
      }
    } else if (event.event === "up") {
      // Only trigger click if both mousedown and mouseup occurred inside
      if (this.mouseDownInside && mouseInside) {
        this.clickHandler();
      }
      this.pressed = false;
      this.mouseDownInside = false;
    }
  }

  draw(ui: WindowsInterfaceDrawer): void {
    if (this.pressed) {
      ui.drawButtonPressed(0, 0, this.rect.width, this.rect.height);
    } else {
      ui.drawButton(0, 0, this.rect.width, this.rect.height);
    }
  }
}
