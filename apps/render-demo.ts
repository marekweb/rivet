import type { SystemContextObject } from "../init";
import type { Manager } from "../manager";
import { type Point, origin } from "../rect";
import { type WindowsInterfaceDrawer, darkGray, teal } from "../screen";
import BaseWidget from "../widgets/BaseWidget";
import TextInput from "../widgets/TextInput";
import type Widget from "../widgets/Widget";

export function renderDemoApplication(context: SystemContextObject): {
  draw: (mouseLocation: Point, mouseDownLocation?: Point) => void;
} {
  const { screen, drawer, screenWidth, screenHeight } = context;

  const application = new RenderDemoApplication(context.manager);
  context.manager.setApplicationWidget(application);

  function draw() {
    screen.drawRect(0, 0, screenWidth, screenHeight, teal);
    drawer.drawWindow(4, 4, screenWidth - 8, screenHeight - 8);

    application.delegateDraw(drawer);
  }

  return { draw };
}

class RenderDemoApplication extends BaseWidget implements Widget {
  private textInput: TextInput;

  constructor(manager: Manager) {
    super(manager, { ...origin, ...manager.getScreenSize() });

    const screenSize = manager.getScreenSize();
    this.textInput = new TextInput(
      manager,
      { x: 8, y: screenSize.height - 30 },
      screenSize.width - 24,
      64
    );
    this.addWidget(this.textInput);
  }

  draw(ui: WindowsInterfaceDrawer): void {
    ui.drawText("drawMultilineText Tests", 8, 8, undefined, undefined, 0, true);

    let y = 24;
    const lineHeight = 12;
    const labelX = 8;
    const textX = 60;

    // Test 1: Simple newline
    ui.drawText("Newlines:", labelX, y, undefined, undefined, 0);
    const multilineText = "Line one\nLine two\nLine three";
    const result1 = ui.drawMultilineText(multilineText, textX, y);
    ui.drawText(
      `(${result1.width}x${result1.height}px)`,
      textX + result1.width + 4,
      y,
      undefined,
      undefined,
      darkGray
    );
    y += result1.height + 4;

    // Test 2: Word wrapping
    ui.drawText("Wrap:", labelX, y, undefined, undefined, 0);
    const wrapText =
      "This is a long sentence that should wrap nicely at the specified width constraint";
    ui.drawRect(textX - 1, y - 1, 100 + 2, 40, 3); // Background box
    const result2 = ui.drawMultilineText(wrapText, textX, y, 100);
    ui.drawText(
      `(${result2.width}x${result2.height}px)`,
      textX + 104,
      y,
      undefined,
      undefined,
      darkGray
    );
    y += result2.height + 4;

    // Test 3: Combined newlines and wrapping
    ui.drawText("Both:", labelX, y, undefined, undefined, 0);
    const combinedText =
      "First paragraph here.\nSecond paragraph that will wrap when it gets too long for the width.";
    ui.drawRect(textX - 1, y - 1, 80 + 2, 50, 3); // Background box
    const result3 = ui.drawMultilineText(combinedText, textX, y, 80);
    ui.drawText(
      `(${result3.width}x${result3.height}px)`,
      textX + 84,
      y,
      undefined,
      undefined,
      darkGray
    );
  }
}
