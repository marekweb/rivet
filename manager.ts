import SystemLog from "./SystemLog";
import PromptService from "./PromptService";
import { HEIGHT, WIDTH } from "./init";
import type { Point, Size } from "./rect";
import { isInRect } from "./rect";
import type { WindowsInterfaceDrawer } from "./screen";
import type Widget from "./widgets/Widget";
import type { WidgetEvent } from "./widgets/Widget";

export class Manager {
  public readonly ui: WindowsInterfaceDrawer;
  public readonly log: SystemLog;
  public readonly prompts: PromptService;
  private applicationWidget?: Widget;
  private modalWidget?: Widget;
  private capturedWidget?: Widget;
  private capturedWidgetOffset: Point = { x: 0, y: 0 };
  private mouseLocation: Point = { x: WIDTH / 2, y: HEIGHT / 2 };
  private previousMouseLocation: Point = { x: WIDTH / 2, y: HEIGHT / 2 };
  private mousePressed = false;
  private focusedWidget?: Widget;

  constructor(ui: WindowsInterfaceDrawer) {
    this.ui = ui;
    this.log = new SystemLog();
    this.prompts = new PromptService(this);
  }

  getMousePressed(): boolean {
    return this.mousePressed;
  }

  getMouseLocation(): Point {
    return this.mouseLocation;
  }
  getPreviousMouseLocation(): Point {
    return this.previousMouseLocation;
  }

  getScreenSize(): Size {
    return { width: WIDTH, height: HEIGHT };
  }

  setApplicationWidget(widget: Widget) {
    this.applicationWidget = widget;
  }

  getApplicationWidget(): Widget | undefined {
    return this.applicationWidget;
  }

  getModalWidget(): Widget | undefined {
    return this.modalWidget;
  }

  getFocusedWidget(): Widget | undefined {
    return this.focusedWidget;
  }

  /**
   * Find the absolute offset of a widget by walking the widget tree.
   * Returns null if the widget is not found in the tree.
   */
  private findWidgetOffset(
    target: Widget,
    current: Widget,
    offsetX = 0,
    offsetY = 0
  ): Point | null {
    if (current === target) {
      return { x: offsetX, y: offsetY };
    }

    for (const child of current.getChildren()) {
      const result = this.findWidgetOffset(
        target,
        child,
        offsetX + child.rect.x,
        offsetY + child.rect.y
      );
      if (result) {
        return result;
      }
    }

    return null;
  }

  requestCapture(widget: Widget): void {
    const rootWidget = this.modalWidget || this.applicationWidget;
    if (!rootWidget) {
      throw new Error("Cannot request capture: no root widget");
    }

    const offset = this.findWidgetOffset(widget, rootWidget, rootWidget.rect.x, rootWidget.rect.y);
    if (!offset) {
      throw new Error("Cannot request capture: widget not found in tree");
    }
    this.capturedWidget = widget;
    this.capturedWidgetOffset = offset;
  }

  releaseCapture(): void {
    this.capturedWidget = undefined;
  }

  requestFocus(widget: Widget): void {
    if (this.focusedWidget === widget) {
      return;
    }

    const previous = this.focusedWidget;
    this.focusedWidget = widget;

    if (previous) {
      previous.handleEvent({ type: "focus", event: "lose" });
    }
    widget.handleEvent({ type: "focus", event: "gain" });
  }

  releaseFocus(widget?: Widget): void {
    if (!this.focusedWidget) {
      return;
    }
    if (widget && widget !== this.focusedWidget) {
      return;
    }

    const previous = this.focusedWidget;
    this.focusedWidget = undefined;
    previous.handleEvent({ type: "focus", event: "lose" });
  }

  setModal(widget: Widget): void {
    this.modalWidget = widget;
  }

  clearModal(): void {
    this.modalWidget = undefined;
  }

  /**
   * Recursively walks the widget tree to find the deepest widget containing the point.
   * Returns the widget, the point in local coordinates, and the absolute offset from screen origin.
   */
  private hitTest(
    widget: Widget,
    point: Point,
    offsetX = 0,
    offsetY = 0
  ): { widget: Widget; localPoint: Point; offset: Point } | null {
    // Translate point to widget's local coordinate space
    const localPoint = {
      x: point.x - offsetX,
      y: point.y - offsetY,
    };

    // Check if point is within this widget's rect
    if (!isInRect(localPoint, { x: 0, y: 0, width: widget.rect.width, height: widget.rect.height })) {
      return null;
    }

    // If this widget has children, try to find a deeper match
    const children = widget.getChildren();
    if (children.length > 0) {
      for (const child of children) {
        const childResult = this.hitTest(
          child,
          point,
          offsetX + child.rect.x,
          offsetY + child.rect.y
        );
        if (childResult) {
          return childResult;
        }
      }
    }

    // No child matched, so this widget is the deepest match
    return { widget, localPoint, offset: { x: offsetX, y: offsetY } };
  }

  emitEvent(event: WidgetEvent) {
    // Update mouse state tracking
    if (event.type === "mouse" && event.event === "move") {
      this.previousMouseLocation = this.mouseLocation;
      this.mouseLocation = event.location;
    } else if (event.type === "mouse" && event.event === "up") {
      this.mousePressed = false;
      // Automatically release capture on mouseup
      this.releaseCapture();
    } else if (event.type === "mouse" && event.event === "down") {
      this.mousePressed = true;
      this.mouseLocation = event.location; // Update location for capture offset calculation
      console.log(`[Manager] Mouse down at screen coords: (${event.location.x}, ${event.location.y})`);
    }

    // For non-mouse events, route to focused widget or fall back to application
    if (event.type !== "mouse") {
      const target = this.focusedWidget ?? this.applicationWidget;
      target?.handleEvent(event);
      return;
    }

    // For mouse events, implement capture, modal, and hit testing logic
    let targetWidget: Widget | undefined;
    let localEvent: WidgetEvent = event;

    const translatePoint = (point: Point, offset: Point): Point => {
      return {
        x: point.x - offset.x,
        y: point.y - offset.y,
      };
    };

    let offset: Point | undefined;

    // Check if a widget has captured mouse events
    if (this.capturedWidget) {
      targetWidget = this.capturedWidget;
      offset = this.capturedWidgetOffset;
      // Translate coordinates to captured widget's local space using saved offset
      const localPoint = translatePoint(event.location, offset);
      localEvent = {
        ...event,
        location: localPoint,
        ...("previousLocation" in event
          ? {
              previousLocation: translatePoint(event.previousLocation, offset),
            }
          : {}),
      };
    } else {
      // No capture - perform hit testing
      // If modal is present, hit test within modal tree only
      const rootWidget = this.modalWidget || this.applicationWidget;

      if (!rootWidget) {
        return;
      }

      // If modal is present and click is outside modal, drop the event
      if (this.modalWidget && !isInRect(event.location, this.modalWidget.rect)) {
        this.releaseFocus();
        return;
      }

      // Perform recursive hit testing
      // Pass root widget's position as initial offset since widgets reposition themselves
      const hitResult = this.hitTest(
        rootWidget,
        event.location,
        rootWidget.rect.x,
        rootWidget.rect.y
      );

      if (hitResult) {
        targetWidget = hitResult.widget;
        offset = hitResult.offset;
        localEvent = {
          ...event,
          location: hitResult.localPoint,
          ...("previousLocation" in event
            ? {
                previousLocation: translatePoint(event.previousLocation, offset),
              }
            : {}),
        };
        if (event.event === "down") {
          console.log(`[Manager] Hit test found widget: ${hitResult.widget.constructor.name} at local coords (${hitResult.localPoint.x}, ${hitResult.localPoint.y})`);
        }
      } else if (event.event === "down") {
        console.log(`[Manager] Hit test found no widget at (${event.location.x}, ${event.location.y})`);
        this.releaseFocus();
      }
    }

    // Dispatch event to target widget
    if (targetWidget && offset) {
      targetWidget.handleEvent(localEvent);
    }
  }
}
