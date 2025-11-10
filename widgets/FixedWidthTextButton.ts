import type { Manager } from "../manager";
import type { Point } from "../rect";
import type { WindowsInterfaceDrawer } from "../screen";
import Button from "./Button";

/**
 * A button with a fixed width that truncates text to fit.
 * Text is centered if it fits within the available space,
 * or left-aligned and truncated if it doesn't.
 */
export default class FixedWidthTextButton extends Button {
  protected label: string;
  private static readonly MARGIN_LEFT = 5;
  private static readonly MARGIN_RIGHT = 5;
  private static readonly MARGIN_TOP = 6;
  private static readonly HEIGHT = 19;

  constructor(
    manager: Manager,
    location: Point,
    width: number,
    label: string,
    clickHandler: () => void
  ) {
    super(
      manager,
      {
        x: location.x,
        y: location.y,
        width,
        height: FixedWidthTextButton.HEIGHT,
      },
      clickHandler
    );
    this.label = label;
  }

  draw(ui: WindowsInterfaceDrawer): void {
    // Draw the button border and background
    super.draw(ui);

    // Calculate available width for text (button width minus margins)
    const availableWidth =
      this.rect.width -
      FixedWidthTextButton.MARGIN_LEFT -
      FixedWidthTextButton.MARGIN_RIGHT;

    // Calculate the full width of the text (without truncation)
    const fullTextWidth = ui.calculateTextWidthBinary(this.label);

    // Determine x position for text
    let textX = FixedWidthTextButton.MARGIN_LEFT;

    // If text fits within available space, center it
    if (fullTextWidth < availableWidth) {
      textX = Math.floor((this.rect.width - fullTextWidth) / 2);
    }

    // Adjust position when button is pressed (visual feedback)
    const textY = this.pressed
      ? FixedWidthTextButton.MARGIN_TOP + 1
      : FixedWidthTextButton.MARGIN_TOP;
    if (this.pressed) {
      textX += 1;
    }

    // Draw text with maxWidth constraint to handle truncation
    ui.drawString(this.label, textX, textY, availableWidth);
  }
}
