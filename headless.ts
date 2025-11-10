/**
 * Headless testing interface for Rivet
 * Allows running the system without a browser/DOM for automated testing
 * Compatible with Node.js native test runner
 */

import fs from "node:fs/promises";
import { createCanvas } from "canvas";
import { type ApplicationFunction, HEIGHT, type SystemContextObject, WIDTH } from "./init";
import type { BinaryFont } from "./load-font";
import { Manager } from "./manager";
import type { Point } from "./rect";
import { CanvasScreen, WindowsInterfaceDrawer } from "./screen";

/**
 * Headless Rivet instance for testing
 * Provides synthetic event injection and state inspection
 */
export class HeadlessRivet {
  private manager: Manager;
  private screen: CanvasScreen;
  private drawer: WindowsInterfaceDrawer;
  private applicationDraw: (mouseLocation: Point, mouseDownLocation?: Point) => void;
  private mouseLocation: Point = { x: 0, y: 0 };
  private mouseDownLocation?: Point;
  private canvas: any; // Store canvas for screenshot capability

  constructor(application: ApplicationFunction, font: BinaryFont) {
    // Create real canvas from 'canvas' package
    this.canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = this.canvas.getContext("2d");

    // Initialize screen and drawer
    this.screen = new CanvasScreen(ctx);
    this.drawer = new WindowsInterfaceDrawer(ctx, font);
    this.manager = new Manager(this.drawer);

    // Create system context
    const contextObject: SystemContextObject = {
      screen: this.screen,
      drawer: this.drawer,
      screenWidth: WIDTH,
      screenHeight: HEIGHT,
      manager: this.manager,
      font: font,
    };

    // Initialize application
    const { draw } = application(contextObject);
    this.applicationDraw = draw;
  }

  /**
   * Get the Manager instance for state inspection
   */
  getManager(): Manager {
    return this.manager;
  }

  /**
   * Get the current mouse location
   */
  getMouseLocation(): Point {
    return { ...this.mouseLocation };
  }

  /**
   * Trigger a redraw of the UI
   */
  draw(): void {
    this.applicationDraw(this.mouseLocation, this.mouseDownLocation);

    // If a modal is present, draw it on top
    const modalWidget = this.manager.getModalWidget();
    if (modalWidget) {
      // Create a fresh drawer for modal (mirrors init.ts behavior)
      const ctx = this.canvas.getContext("2d");
      const font = (this.drawer as any).font2; // Access private font
      const modalDrawer = new WindowsInterfaceDrawer(ctx, font);
      modalWidget.delegateDraw(modalDrawer);
    }
  }

  /**
   * Inject a synthetic mouse move event
   */
  mouseMove(x: number, y: number): void {
    const previousLocation = this.mouseLocation;
    this.mouseLocation = { x, y };

    this.manager.emitEvent({
      type: "mouse",
      location: this.mouseLocation,
      previousLocation: previousLocation,
      event: "move",
    });
  }

  /**
   * Inject a synthetic mouse down event
   */
  mouseDown(x: number, y: number, button = 0): void {
    this.mouseLocation = { x, y };
    this.mouseDownLocation = { x, y };

    this.manager.emitEvent({
      type: "mouse",
      location: this.mouseLocation,
      button: button,
      event: "down",
    });

    this.draw();
  }

  /**
   * Inject a synthetic mouse up event
   */
  mouseUp(x: number, y: number, button = 0): void {
    this.mouseLocation = { x, y };
    const upLocation = { x, y };

    this.manager.emitEvent({
      type: "mouse",
      location: upLocation,
      button: button,
      event: "up",
    });

    this.mouseDownLocation = undefined;
    this.draw();
  }

  /**
   * Convenience method: Inject a complete click (down + up) at a location
   */
  click(x: number, y: number, button = 0): void {
    this.mouseDown(x, y, button);
    this.mouseUp(x, y, button);
  }

  /**
   * Convenience method: Simulate a drag from start to end position
   */
  drag(startX: number, startY: number, endX: number, endY: number, steps = 10): void {
    this.mouseDown(startX, startY);

    // Emit intermediate move events
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(startX + (endX - startX) * t);
      const y = Math.round(startY + (endY - startY) * t);
      this.mouseMove(x, y);
    }

    this.mouseUp(endX, endY);
  }

  /**
   * Inject a keyboard keydown event
   */
  keyDown(keyCode: number): void {
    this.manager.emitEvent({
      type: "key",
      key: keyCode,
      event: "down",
    });
  }

  /**
   * Inject a typed character (text input)
   */
  typeChar(char: string): void {
    if (char.length === 0) {
      return;
    }

    this.manager.emitEvent({
      type: "typed",
      char: char[0],
    });
  }

  /**
   * Get screen dimensions
   */
  getScreenSize(): { width: number; height: number } {
    return { width: WIDTH, height: HEIGHT };
  }

  /**
   * Save current screen as PNG image
   */
  async saveScreenshot(path: string): Promise<void> {
    const buffer = this.canvas.toBuffer("image/png");
    await fs.writeFile(path, buffer);
  }

  /**
   * Get all logged messages from the system log
   */
  getLogs(): string[] {
    return this.manager.log.read();
  }

  /**
   * Print all logged messages to stdout
   */
  printLogs(): void {
    const logs = this.getLogs();
    if (logs.length === 0) {
      console.log("[No logs]");
    } else {
      logs.forEach((log) => {
        console.log(`[LOG] ${log}`);
      });
    }
  }
}
