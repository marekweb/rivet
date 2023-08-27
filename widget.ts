import { Point, Rect, isInRect } from "./rect";
import { WindowsInterfaceDrawer } from "./screen";

type WidgetEvent = KeyboardWidgetEvent | MouseWidgetEvent;

interface KeyboardWidgetEvent {
  type: "key";
  key: number;
  event: "down" | "up";
}

interface MouseWidgetEvent {
  type: "mouse";
  location: Point;
  button: number;
  event: "down" | "up" | "enter" | "leave";
}

export interface Widget {
  rect: Rect;
  delegateEvent(event: WidgetEvent): void;
  handleEvent(event: WidgetEvent): void;
  draw(ui: WindowsInterfaceDrawer): void;
}

export class BaseWidget {
  protected manager: Manager;
  protected rect: Rect;
  protected children: Widget[] = [];

  constructor(manager: Manager, rect: Rect) {
    this.manager = manager;
    this.rect = rect;
  }

  addWidget(child: Widget): void {
    this.children.push(child);
  }

  delegateEvent(event: WidgetEvent): void {
    let handled = false;

    if (event.type === "mouse") {
      for (const child of this.children) {
        if (isInRect(event.location, child.rect)) {
          child.delegateEvent(event);
          handled = true;
        }
      }
    }
    if (!handled) {
      this.handleEvent(event);
    }
  }

  handleEvent(event: WidgetEvent): void {
    console.debug("Unhandled event", event);
  }

  draw(ui: WindowsInterfaceDrawer): void {
    for (const child of this.children) {
      child.draw(ui);
    }
  }
}
