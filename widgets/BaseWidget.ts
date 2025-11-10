import type { Manager } from "../manager";
import {
  type Rect,
  isRectContained,
  normalizeRect,
  rectIntersects,
} from "../rect";
import type { WindowsInterfaceDrawer } from "../screen";
import type Widget from "./Widget";
import type { WidgetEvent } from "./Widget";

export default abstract class BaseWidget {
  public rect: Rect;
  protected manager: Manager;
  protected children: Widget[] = [];

  constructor(manager: Manager, rect: Rect) {
    this.manager = manager;
    this.rect = normalizeRect(rect, manager.getScreenSize());
  }

  addWidget(child: Widget): void {
    // A widget's rect.x/y place it on screen, but everything inside the widget—
    // its drawing commands and its children—must stay in local coordinates
    // relative to (0,0) at the parent's top-left.
    const parentLocalRect: Rect = {
      x: 0,
      y: 0,
      width: this.rect.width,
      height: this.rect.height,
    };

    if (!isRectContained(child.rect, parentLocalRect)) {
      const formatRect = ({ x, y, width, height }: Rect) => {
        const x2 = x + width;
        const y2 = y + height;
        return `x1=left=${x}, y1=top=${y}, w=${width}, h=${height}, x2=right=${x2}, y2=bottom=${y2}`;
      };

      // Calculate overflow amounts
      const overflowLeft = child.rect.x < 0 ? -child.rect.x : 0;
      const overflowTop = child.rect.y < 0 ? -child.rect.y : 0;
      const overflowRight = Math.max(
        0,
        child.rect.x + child.rect.width - parentLocalRect.width
      );
      const overflowBottom = Math.max(
        0,
        child.rect.y + child.rect.height - parentLocalRect.height
      );

      const overflows: string[] = [];
      if (overflowLeft > 0) overflows.push(`left by ${overflowLeft}px`);
      if (overflowTop > 0) overflows.push(`top by ${overflowTop}px`);
      if (overflowRight > 0) overflows.push(`right by ${overflowRight}px`);
      if (overflowBottom > 0) overflows.push(`bottom by ${overflowBottom}px`);

      throw new Error(
        `Child widget extends outside parent bounds:\n  Child (${child.constructor.name}): ${formatRect(child.rect)}\n  Parent (${this.constructor.name}): ${formatRect(parentLocalRect)}\n  Overflow: ${overflows.join(", ")}`
      );
    }

    // Check for rect collision
    for (const existingChild of this.children) {
      if (rectIntersects(existingChild.rect, child.rect)) {
        const formatRect = ({ x, y, width, height }: Rect) => {
          const x2 = x + width;
          const y2 = y + height;
          return `x=${x}, y=${y}, w=${width}, h=${height}, x2=${x2}, y2=${y2}`;
        };
        throw new Error(
          `Widget collision detected:\n  New widget: ${child.constructor.name} (${formatRect(child.rect)})\n  Existing widget: ${existingChild.constructor.name} (${formatRect(existingChild.rect)})\n  Parent: ${this.constructor.name}`
        );
      }
    }

    this.children.push(child);
  }

  delegateEvent(event: WidgetEvent): void {
    this.handleEvent(event);
  }

  handleEvent(event: WidgetEvent): void {}

  draw(ui: WindowsInterfaceDrawer): void {}

  delegateDraw(ui: WindowsInterfaceDrawer): void {
    ui.pushTransform(this.rect.x, this.rect.y);
    this.draw(ui);
    for (const child of this.children) {
      child.delegateDraw(ui);
    }
    ui.popTransform();
  }

  getChildren(): Widget[] {
    return this.children;
  }
}
