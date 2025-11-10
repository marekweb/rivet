import type { Manager } from "../manager";
import type { Point } from "../rect";
import { darkGray, type WindowsInterfaceDrawer } from "../screen";
import Button from "./Button";

export default class TextButton extends Button {
  protected label: string;

  constructor(
    manager: Manager,
    location: Point,
    label: string,
    clickHandler: () => void
  ) {
    super(
      manager,
      { x: location.x, y: location.y, width: 0, height: 19 },
      clickHandler
    );
    this.rect.width = this.manager.ui.calculateTextWidthBinary(label) + 10;
    this.label = label;
  }

  draw(ui: WindowsInterfaceDrawer): void {
    super.draw(ui);
    const color = this.disabled ? darkGray : undefined;
    if (this.pressed) {
      ui.drawText(this.label, 5, 7, undefined, undefined, color);
    } else {
      ui.drawText(this.label, 4, 6, undefined, undefined, color);
    }
  }
}
