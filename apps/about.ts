import type { SystemContextObject } from "../init";
import type { Manager } from "../manager";
import { type Point, centerHorizontally, centerRect, origin } from "../rect";
import {
  type WindowsInterfaceDrawer,
  black,
  darkBlue,
  darkGray,
  lightGray,
  teal,
  white,
} from "../screen";
import BaseWidget from "../widgets/BaseWidget";
import TextButton from "../widgets/TextButton";
import type Widget from "../widgets/Widget";

export function aboutApplication(context: SystemContextObject): {
  draw: (mouseLocation: Point, mouseDownLocation?: Point) => void;
} {
  const { screen, drawer, screenWidth, screenHeight } = context;

  const application = new AboutApplication(context.manager);
  context.manager.setApplicationWidget(application);

  function draw() {
    screen.drawRect(0, 0, screenWidth, screenHeight, teal);

    application.delegateDraw(drawer);
  }

  return { draw };
}

class AboutApplication extends BaseWidget implements Widget {
  private okButton: TextButton;
  private windowWidth = 180;
  private windowHeight = 100;

  constructor(manager: Manager) {
    super(manager, { ...origin, ...manager.getScreenSize() });

    // Calculate centered position for the window
    const { x: windowX, y: windowY } = centerRect(
      { height: this.windowHeight, width: this.windowWidth },
      this.rect
    );
    this.rect.x = windowX;
    this.rect.y = windowY;
    this.rect.width = this.windowWidth;
    this.rect.height = this.windowHeight;

    // Create OK button
    this.okButton = new TextButton(
      manager,
      {
        x: 0, // will be set later once we know its size
        y: this.windowHeight - 30, // relative to window
      },
      "OK",
      async () => {
        const confirmed = await manager.prompts.confirm("Are you sure?");
        if (confirmed) {
          // Close the about application
          window.location.hash = "shell";
          window.location.reload();
        }
      }
    );

    const localRect = {
      x: 0,
      y: 0,
      width: this.rect.width,
      height: this.rect.height,
    };
    this.okButton.rect.x = centerHorizontally(this.okButton.rect, localRect);
    this.addWidget(this.okButton);
  }

  draw(ui: WindowsInterfaceDrawer) {
    ui.drawWindow(0, 0, this.rect.width, this.rect.height);

    const titleBarX = 3;
    const titleBarY = 3;
    const titleBarWidth = this.windowWidth - 6;
    const titleBarHeight = 14;

    ui.drawRect(titleBarX, titleBarY, titleBarWidth, titleBarHeight, darkBlue);

    ui.drawText(
      "About RetroOS",
      titleBarX + 4,
      titleBarY + 3,
      undefined,
      undefined,
      white,
      true
    );

    const panelX = 12;
    const panelY = 30;
    ui.drawPanel(panelX, panelY, 24, 24, lightGray);
    ui.drawDitheredRect(panelX + 2, panelY + 2, 20, 20, white, lightGray);
    ui.drawText("R", panelX + 9, panelY + 8, undefined, undefined, darkGray);
    ui.drawText("R", panelX + 8, panelY + 9, undefined, undefined, darkGray);
    ui.drawText("R", panelX + 9, panelY + 9, undefined, undefined, darkGray);

    ui.drawText("R", panelX + 8, panelY + 8, undefined, undefined, black);

    ui.drawTextBlock("RetroOS\n(c) 1987 RetroSoft\nVersion 1.1.3\n", 44, 30, 2);
  }
}
