import type { SystemContextObject } from "../init";
import type { Manager } from "../manager";
import { type Point, type Rect, centerRect, origin } from "../rect";
import {
  type WindowsInterfaceDrawer,
  black,
  darkBlue,
  darkGray,
  teal,
  white,
} from "../screen";
import BaseWidget from "../widgets/BaseWidget";
import Button from "../widgets/Button";
import type Widget from "../widgets/Widget";

export function shellApplication(context: SystemContextObject): {
  draw: (mouseLocation: Point, mouseDownLocation?: Point) => void;
} {
  const { screen, drawer, screenWidth, screenHeight } = context;

  const application = new ShellApplication(context.manager);
  context.manager.setApplicationWidget(application);

  function draw() {
    // Draw the "desktop" background
    screen.drawRect(0, 0, screenWidth, screenHeight, teal);

    application.delegateDraw(drawer);
  }

  return { draw };
}

interface AppInfo {
  name: string;
  hash: string;
  description: string;
  icon: string;
}

/**
 * AppButton - A button widget that displays an app icon and label.
 * Handles its own drawing and click events via the widget system.
 */
class AppButton extends Button {
  constructor(
    manager: Manager,
    rect: Rect,
    private app: AppInfo,
    private buttonSize: number,
    private iconLetter: string
  ) {
    super(manager, rect, () => {
      // Navigate to the selected application
      window.location.hash = app.hash;
      window.location.reload();
    });
  }

  draw(ui: WindowsInterfaceDrawer): void {
    // Draw button background
    ui.drawPanel(0, 0, this.buttonSize, this.buttonSize);

    // Draw icon
    const iconX = Math.floor(this.buttonSize / 2) - 4;
    const iconY = Math.floor(this.buttonSize / 2) - 4;
    ui.drawText(
      this.iconLetter,
      iconX,
      iconY,
      undefined,
      undefined,
      darkBlue,
      true
    );

    // Draw app name below button
    const nameWidth = ui.calculateTextWidthBinary(this.app.name, undefined, 2);
    const nameX = Math.floor((this.buttonSize - nameWidth) / 2);
    const nameY = this.buttonSize + 4;
    ui.drawText(this.app.name, nameX, nameY, undefined, 2, black);
  }
}

class ShellApplication extends BaseWidget implements Widget {
  private apps: AppInfo[] = [
    {
      name: "Calculator",
      hash: "calculator",
      description: "Simple calculator demo",
      icon: "C",
    },
    {
      name: "Font Editor",
      hash: "fontedit",
      description: "Edit bitmap fonts",
      icon: "F",
    },
    {
      name: "Bitmap Editor",
      hash: "bitmapedit",
      description: "Edit 2bpp bitmaps",
      icon: "B",
    },
    {
      name: "Render Demo",
      hash: "renderdemo",
      description: "String rendering tests",
      icon: "R",
    },
    { name: "About", hash: "about", description: "About RetroOS", icon: "A" },
    {
      name: "Log Viewer",
      hash: "logviewer",
      description: "Inspect logs",
      icon: "L",
    },
  ];

  // Fixed grid dimensions
  private readonly gridCols = 3;
  private readonly gridRows = 3;

  // Button is the small icon button for each app
  private readonly buttonSize = 20;
  private readonly horizontalSpacing = 30;
  private readonly verticalSpacing = 10;
  private readonly labelHeight = 8;
  private readonly labelSpacing = 2;

  // Fixed window size
  private readonly windowWidth = 180;
  private readonly windowHeight = 160;

  // Total height of each app button including icon and label
  private getTotalButtonHeight(): number {
    return this.buttonSize + this.labelSpacing + this.labelHeight;
  }

  constructor(manager: Manager) {
    super(manager, { ...origin, ...manager.getScreenSize() });

    // Calculate centered position for the window
    const { x: windowX, y: windowY } = centerRect(
      { width: this.windowWidth, height: this.windowHeight },
      this.rect
    );
    this.rect.x = windowX;
    this.rect.y = windowY;
    this.rect.width = this.windowWidth;
    this.rect.height = this.windowHeight;

    // Create AppButton widgets for each app (up to gridCols * gridRows)
    this.createAppButtons();
  }

  private createAppButtons(): void {
    const contentStartY = 20; // Account for title bar
    const contentHeight = this.windowHeight - 40; // Account for title bar and bottom margin
    const totalButtonHeight = this.getTotalButtonHeight();

    // Calculate grid dimensions based on fixed 3x3 layout
    const gridWidth =
      this.gridCols * (this.buttonSize + this.horizontalSpacing) -
      this.horizontalSpacing;
    const gridHeight =
      this.gridRows * (totalButtonHeight + this.verticalSpacing) -
      this.verticalSpacing;

    const gridStartX = (this.windowWidth - gridWidth) / 2;
    const gridStartY = contentStartY + (contentHeight - gridHeight) / 2;

    // Fill the grid with apps (up to gridCols * gridRows slots)
    const maxApps = Math.min(this.apps.length, this.gridCols * this.gridRows);

    for (let i = 0; i < maxApps; i++) {
      const col = i % this.gridCols;
      const row = Math.floor(i / this.gridCols);

      const buttonX =
        gridStartX + col * (this.buttonSize + this.horizontalSpacing);
      const buttonY =
        gridStartY + row * (totalButtonHeight + this.verticalSpacing);

      // The button rect includes space for both the icon and the label below it
      const buttonRect = {
        x: buttonX,
        y: buttonY,
        width: this.buttonSize,
        height: totalButtonHeight,
      };

      const appButton = new AppButton(
        this.manager,
        buttonRect,
        this.apps[i],
        this.buttonSize,
        this.apps[i].icon // icon letter
      );
      this.addWidget(appButton);
    }
  }

  draw(ui: WindowsInterfaceDrawer): void {
    // Draw the main window
    ui.drawWindow(0, 0, this.rect.width, this.rect.height);

    // These are standard titlebar constants.
    const titleBarX = 3;
    const titleBarY = 3;
    const titleBarWidth = this.windowWidth - 6;
    const titleBarHeight = 14;

    // Draw title bar
    ui.drawRect(titleBarX, titleBarY, titleBarWidth, titleBarHeight, darkBlue);

    // Draw the title text
    ui.drawText(
      "RetroOS Shell",
      titleBarX + 4,
      titleBarY + 3,
      undefined,
      undefined,
      white,
      true
    );

    // Draw instructions at bottom of window, centered.
    const instructions = "Click an application to launch it";
    const instructionsWidth = ui.calculateTextWidthBinary(instructions);
    const instructionsX = Math.floor(
      (this.windowWidth - instructionsWidth) / 2
    );
    ui.drawText(
      instructions,
      instructionsX,
      this.windowHeight - 15,
      undefined,
      undefined,
      darkGray
    );
  }
}
