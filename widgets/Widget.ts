import type { Point, Rect } from "../rect";
import type { WindowsInterfaceDrawer } from "../screen";

export type WidgetEvent =
  | KeyboardWidgetEvent
  | TypedWidgetEvent
  | FocusWidgetEvent
  | MouseButtonEvent
  | MouseMoveEvent;

interface KeyboardWidgetEvent {
  type: "key";
  key: number;
  event: "down" | "up";
}

interface TypedWidgetEvent {
  type: "typed";
  char: string;
}

interface FocusWidgetEvent {
  type: "focus";
  event: "gain" | "lose";
}

interface MouseEvent {
  type: "mouse";
  location: Point;
}

interface MouseButtonEvent extends MouseEvent {
  event: "down" | "up";
  button: number;
}

interface MouseMoveEvent extends MouseEvent {
  event: "move" | "enter" | "leave";
  previousLocation: Point;
}

export default interface Widget {
  rect: Rect;
  delegateEvent(event: WidgetEvent): void;
  handleEvent(event: WidgetEvent): void;
  delegateDraw(ui: WindowsInterfaceDrawer): void;
  draw(ui: WindowsInterfaceDrawer): void;
  getChildren(): Widget[];
}
