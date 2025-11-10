import type { SystemContextObject } from "../init";
import type { Manager } from "../manager";
import { type Point, centerRect, origin } from "../rect";
import {
  type WindowsInterfaceDrawer,
  black,
  darkBlue,
  darkGray,
  lightGray,
  red,
  teal,
  white,
} from "../screen";
import BaseWidget from "../widgets/BaseWidget";
import TextButton from "../widgets/TextButton";
import type Widget from "../widgets/Widget";

export function logViewerApplication(context: SystemContextObject): {
  draw: (mouseLocation: Point, mouseDownLocation?: Point) => void;
} {
  const { screen, drawer, screenWidth, screenHeight } = context;

  const application = new LogViewerApplication(context.manager);
  context.manager.setApplicationWidget(application);

  function draw() {
    screen.drawRect(0, 0, screenWidth, screenHeight, teal);
    application.delegateDraw(drawer);
  }

  return { draw };
}

class LogViewerApplication extends BaseWidget implements Widget {
  private windowWidth = 220;
  private windowHeight = 150;
  private addLogButton: TextButton;
  private clearLogButton: TextButton;
  private logCounter = 1;
  private readonly truncationMarker = "...";

  constructor(manager: Manager) {
    super(manager, { ...origin, ...manager.getScreenSize() });

    const { x, y } = centerRect(
      { width: this.windowWidth, height: this.windowHeight },
      this.rect
    );
    this.rect.x = x;
    this.rect.y = y;
    this.rect.width = this.windowWidth;
    this.rect.height = this.windowHeight;

    const buttonY = this.windowHeight - 28;

    this.addLogButton = new TextButton(
      manager,
      { x: 0, y: buttonY },
      "Add Log Entry",
      () => this.handleAddLog()
    );
    this.addLogButton.rect.x = 10;

    this.clearLogButton = new TextButton(
      manager,
      { x: 0, y: buttonY },
      "Clear Logs",
      () => this.handleClearLogs()
    );
    this.clearLogButton.rect.x =
      this.windowWidth - this.clearLogButton.rect.width - 10;

    this.addWidget(this.addLogButton);
    this.addWidget(this.clearLogButton);
  }

  handleEvent(): void {
    // Manager handles routing directly to child widgets
  }

  private handleAddLog(): void {
    const date = new Date();
    const timestamp = date.toISOString().slice(0, 19);
    const randomId = Math.floor(Math.random() * 10000);
    this.manager.log.write(
      `${timestamp} • This is a sample log entry with random ID ${randomId} to demonstrate text wrapping and clamping behavior #${this.logCounter++}`
    );
  }

  private handleClearLogs(): void {
    this.manager.log.clear();
    this.logCounter = 1;
  }

  private drawTextWithEllipsis(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    ui: WindowsInterfaceDrawer,
    color: number = black
  ): void {
    // Calculate ellipsis width
    const ellipsisWidth = ui.calculateTextWidthBinary(this.truncationMarker);
    
    // First, check if truncation is needed
    const truncated = (ui as any).truncateTextToWidth(text, maxWidth);
    
    // If no truncation occurred, just draw the full text
    if (truncated === text) {
      ui.drawText(text, x, y, undefined, undefined, color);
      return;
    }

    // Truncation occurred, so we need to make room for ellipsis
    if (maxWidth <= ellipsisWidth) {
      // Can't fit ellipsis, just draw what we can
      ui.drawText(truncated, x, y, undefined, undefined, color);
    } else {
      // Draw truncated text + ellipsis
      const availableForText = maxWidth - ellipsisWidth;
      const truncatedWithSpace = (ui as any).truncateTextToWidth(
        text,
        availableForText
      );
      const finalText = truncatedWithSpace + this.truncationMarker;
      // Use drawTextClamped to ensure it doesn't exceed maxWidth
      ui.drawTextClamped(finalText, x, y, maxWidth, undefined, undefined, color);
    }
  }

  draw(ui: WindowsInterfaceDrawer): void {
    ui.drawWindow(0, 0, this.rect.width, this.rect.height);

    const titleBarX = 3;
    const titleBarY = 3;
    const titleBarWidth = this.windowWidth - 6;
    const titleBarHeight = 14;

    ui.drawRect(titleBarX, titleBarY, titleBarWidth, titleBarHeight, darkBlue);

    ui.drawText(
      "System Log Viewer",
      titleBarX + 4,
      titleBarY + 3,
      undefined,
      undefined,
      white,
      true
    );

    const panelX = 6;
    const panelY = 26;
    const panelWidth = this.windowWidth - 12;
    const panelHeight = this.windowHeight - 60;

    ui.drawPanel(panelX, panelY, panelWidth, panelHeight, lightGray);

    // Draw X markers for left and right edges of panel
    const markerY = panelY - 3;
    // Left edge marker
    ui.drawRect(panelX, markerY, 1, 2, red);
    // Right edge marker (at panelX + panelWidth)
    ui.drawRect(panelX + panelWidth - 1, markerY, 1, 2, red);

    const contentX = panelX + 4;
    const contentY = panelY + 4;
    const contentWidth = panelWidth - 8;
    const contentHeight = panelHeight - 8;
    const lineHeight = ui.getFontHeight() + 2;
    const maxLines = Math.max(1, Math.floor(contentHeight / lineHeight));

    // Draw carets to show text drawable region
    const caretY = contentY - 2;
    ui.drawRect(contentX, caretY, 1, 2, red);
    ui.drawRect(contentX + contentWidth - 1, caretY, 1, 2, red);

    const logs = this.manager.log.read();
    const visibleLogs = logs.slice(-maxLines);
    let currentY = contentY;

    if (visibleLogs.length === 0) {
      ui.drawTextClamped(
        "No log entries yet. Click \"Add Log Entry\" to generate one.",
        contentX,
        currentY,
        contentWidth,
        undefined,
        undefined,
        darkGray
      );
      return;
    }

    const startIndex = logs.length - visibleLogs.length;
    for (let i = 0; i < visibleLogs.length; i++) {
      const entryNumber = startIndex + i + 1;
      const logLine = `${entryNumber.toString().padStart(3, "0")}: ${visibleLogs[i]}`;
      this.drawTextWithEllipsis(logLine, contentX, currentY, contentWidth, ui, black);
      currentY += lineHeight;
    }
  }
}
