import type { Manager } from "../manager";
import type { Point } from "../rect";
import { isInRect } from "../rect";
import { black, darkBlue, lightGray, white, type WindowsInterfaceDrawer } from "../screen";
import BaseWidget from "./BaseWidget";
import type Widget from "./Widget";
import type { WidgetEvent } from "./Widget";

export default class TextInput extends BaseWidget implements Widget {
  public value = "";
  public cursor = 0;
  public focused = false;
  private readonly maxLength: number;

  constructor(manager: Manager, location: Point, width: number, maxLength: number) {
    super(manager, { x: location.x, y: location.y, width: width, height: 20 });
    if (maxLength <= 0) {
      throw new Error("TextInput maxLength must be positive");
    }
    this.maxLength = maxLength;
  }

  handleEvent(event: WidgetEvent): void {
    if (event.type === "focus") {
      this.focused = event.event === "gain";
      this.cursor = Math.min(this.cursor, this.value.length);
      return;
    }

    if (event.type === "mouse" && event.event === "down") {
      this.manager.requestFocus(this);
      // Click to focus
      // Calculate cursor position based on click location
      const localRect = { x: 0, y: 0, width: this.rect.width, height: this.rect.height };
      if (isInRect(event.location, localRect)) {
        const clickX = event.location.x - 4; // Account for left padding

        // Find closest character position
        let bestPos = 0;
        let bestDistance = Math.abs(clickX);

        for (let i = 1; i <= this.value.length; i++) {
          const textWidth = this.manager.ui.calculateTextWidthBinary(this.value.substring(0, i));
          const distance = Math.abs(clickX - textWidth);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPos = i;
          }
        }

        this.cursor = bestPos;
      }
    } else if (event.type === "typed" && this.focused) {
      this.insertCharacter(event.char);
    } else if (event.type === "key" && this.focused) {
      this.handleKeyEvent(event);
    }
  }

  private insertCharacter(char: string): void {
    if (char.length === 0 || this.value.length >= this.maxLength) {
      return;
    }

    const available = this.maxLength - this.value.length;
    const toInsert = char.slice(0, available);
    this.value = this.value.slice(0, this.cursor) + toInsert + this.value.slice(this.cursor);
    this.cursor += toInsert.length;
  }

  private handleKeyEvent(event: WidgetEvent): void {
    if (event.type !== "key" || event.event !== "down") {
      return;
    }

    const key = event.key;

    // Backspace (key code 8)
    if (key === 8 && this.cursor > 0) {
      this.value = this.value.slice(0, this.cursor - 1) + this.value.slice(this.cursor);
      this.cursor--;
    }
    // Left arrow (key code 37)
    else if (key === 37 && this.cursor > 0) {
      this.cursor--;
    }
    // Right arrow (key code 39)
    else if (key === 39 && this.cursor < this.value.length) {
      this.cursor++;
    }
    // Home (key code 36)
    else if (key === 36) {
      this.cursor = 0;
    }
    // End (key code 35)
    else if (key === 35) {
      this.cursor = this.value.length;
    }
  }

  draw(ui: WindowsInterfaceDrawer): void {
    // Use local coordinates (0, 0) since BaseWidget handles transforms
    const localX = 0;
    const localY = 0;

    // Background - white for focused, light gray for unfocused
    ui.drawRect(
      localX,
      localY,
      this.rect.width,
      this.rect.height,
      this.focused ? white : lightGray
    );

    // Border - blue when focused, black otherwise
    ui.drawBox(
      localX,
      localY,
      this.rect.width,
      this.rect.height,
      this.focused ? darkBlue : black
    );

    // Text
    const textX = localX + 4;
    const textY = localY + 6;

    if (this.value.length > 0) {
      ui.drawText(
        this.value,
        textX,
        textY,
        undefined,
        undefined,
        black
      );
    }

    // Draw cursor when focused
    if (this.focused) {
      const beforeCursor = this.value.substring(0, this.cursor);
      const cursorX = textX + ui.calculateTextWidthBinary(beforeCursor);
      const cursorY = textY - 1;
      const cursorHeight = 10;

      // Draw cursor line
      ui.drawRect(cursorX, cursorY, 1, cursorHeight, black);
    }
  }
}
