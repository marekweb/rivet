/**
 * Example test file demonstrating headless Rivet testing
 * Run with: node --import tsx --test headless.test.ts
 * Or with npm: npm test
 *
 * These tests use REAL widgets (Button, TextButton, etc.) with a blind headless canvas.
 * Drawing commands go to the void - we only test interaction logic and state.
 */

import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, test } from "node:test";
import { aboutApplication } from "./apps/about";
import { bitmapEditorApplication } from "./apps/bitmap-editor";
import { logViewerApplication } from "./apps/log-viewer";
import { HeadlessRivet } from "./headless";
import type { BinaryFont } from "./load-font";
import { loadBinaryFrontFromDiskFormat } from "./load-font";
import BaseWidget from "./widgets/BaseWidget";
import TextButton from "./widgets/TextButton";
import TextInput from "./widgets/TextInput";
import type Widget from "./widgets/Widget";

// Load real font from disk
async function loadRealFont(): Promise<BinaryFont> {
  const fontPath = path.join(process.cwd(), "font2.fontbin");
  const fontData = await fs.readFile(fontPath);
  return loadBinaryFrontFromDiskFormat(new Uint8Array(fontData));
}

// Create a minimal mock font for testing (fallback)
function createMockFont(): BinaryFont {
  const glyphWidth = 6;
  const fontHeight = 8;
  const numGlyphs = 94; // ASCII 33-126

  return {
    type: "monospace",
    glyphWidth,
    fontHeight,
    data: new Uint8Array(numGlyphs * fontHeight * glyphWidth), // All zeros = blank glyphs
  };
}

// Helper to save a screenshot
async function saveSnapshot(rivet: HeadlessRivet, name: string): Promise<void> {
  const snapshotDir = path.join(process.cwd(), "snapshots");
  await fs.mkdir(snapshotDir, { recursive: true });

  const timestamp = Date.now();
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(snapshotDir, filename);

  await rivet.saveScreenshot(filepath);
  console.log(`Screenshot saved: ${filepath}`);
}

describe("HeadlessRivet", () => {
  test("should initialize without errors", () => {
    const mockFont = createMockFont();
    const rivet = new HeadlessRivet((context) => {
      return {
        draw: () => {
          // Minimal draw function
        },
      };
    }, mockFont);

    assert.ok(rivet);
    assert.ok(rivet.getManager());
  });

  test("should track mouse location", () => {
    const mockFont = createMockFont();
    const rivet = new HeadlessRivet((context) => {
      return { draw: () => {} };
    }, mockFont);

    rivet.mouseMove(100, 50);
    const location = rivet.getMouseLocation();

    assert.strictEqual(location.x, 100);
    assert.strictEqual(location.y, 50);
  });

  test("should handle button clicks with real app", async () => {
    const realFont = await loadRealFont();

    const rivet = new HeadlessRivet(aboutApplication, realFont);

    // Draw the UI first
    rivet.draw();
    await saveSnapshot(rivet, "about-app-initial");

    // Click somewhere on screen
    rivet.click(128, 96);

    await saveSnapshot(rivet, "about-app-after-click");

    // Just verify the rivet instance is valid
    assert.ok(rivet.getManager());
  });

  test("should render bitmap editor with real font", async () => {
    const realFont = await loadRealFont();

    const rivet = new HeadlessRivet(bitmapEditorApplication, realFont);

    // Draw the UI
    rivet.draw();
    await saveSnapshot(rivet, "bitmap-editor");

    // Verify instance
    assert.ok(rivet.getManager());
  });

  test("should support button drag behavior (press outside)", () => {
    const mockFont = createMockFont();
    let buttonClicked = false;

    const rivet = new HeadlessRivet((context) => {
      const button = new TextButton(
        context.manager,
        { x: 50, y: 50, width: 100, height: 30 },
        "Test Button",
        () => {
          buttonClicked = true;
        }
      );

      const container = new BaseWidget(context.manager, { x: 0, y: 0, width: 256, height: 192 });
      container.addWidget(button);
      context.manager.setApplicationWidget(container);

      return { draw: () => container.delegateDraw(context.drawer) };
    }, mockFont);

    // Press on button, drag outside, release outside - should NOT trigger click
    rivet.mouseDown(100, 65);
    rivet.mouseMove(200, 100);
    rivet.mouseUp(200, 100);

    assert.strictEqual(buttonClicked, false);
  });

  test("should update manager mouse state", () => {
    const mockFont = createMockFont();
    const rivet = new HeadlessRivet((context) => {
      return { draw: () => {} };
    }, mockFont);

    const manager = rivet.getManager();

    // Initially not pressed
    assert.strictEqual(manager.getMousePressed(), false);

    // After mouse down, should be pressed
    rivet.mouseDown(10, 10);
    assert.strictEqual(manager.getMousePressed(), true);

    // After mouse up, should not be pressed
    rivet.mouseUp(10, 10);
    assert.strictEqual(manager.getMousePressed(), false);
  });

  test("should support multiple buttons in container", () => {
    const mockFont = createMockFont();
    let button1Clicked = false;
    let button2Clicked = false;

    const rivet = new HeadlessRivet((context) => {
      const button1 = new TextButton(
        context.manager,
        { x: 10, y: 10, width: 80, height: 30 },
        "Button 1",
        () => { button1Clicked = true; }
      );

      const button2 = new TextButton(
        context.manager,
        { x: 100, y: 10, width: 80, height: 30 },
        "Button 2",
        () => { button2Clicked = true; }
      );

      const container = new BaseWidget(context.manager, { x: 0, y: 0, width: 256, height: 192 });
      container.addWidget(button1);
      container.addWidget(button2);
      context.manager.setApplicationWidget(container);

      return { draw: () => container.delegateDraw(context.drawer) };
    }, mockFont);

    // Click button 1
    rivet.click(50, 25);
    assert.strictEqual(button1Clicked, true);
    assert.strictEqual(button2Clicked, false);

    // Click button 2
    rivet.click(140, 25);
    assert.strictEqual(button2Clicked, true);
  });

  test("text input backspace removes preceding character", () => {
    const mockFont = createMockFont();
    let textInput!: TextInput;

    const rivet = new HeadlessRivet((context) => {
      textInput = new TextInput(
        context.manager,
        { x: 10, y: 10 },
        120,
        16
      );

      const container = new BaseWidget(context.manager, { x: 0, y: 0, width: 256, height: 192 });
      container.addWidget(textInput);
      context.manager.setApplicationWidget(container);

      return { draw: () => container.delegateDraw(context.drawer) };
    }, mockFont);

    const manager = rivet.getManager();
    manager.requestFocus(textInput!);

    rivet.typeChar("A");
    rivet.typeChar("B");
    assert.strictEqual(textInput!.value, "AB");
    assert.strictEqual(textInput!.cursor, 2);

    rivet.keyDown(8); // backspace

    assert.strictEqual(textInput!.value, "A");
    assert.strictEqual(textInput!.cursor, 1);
  });

  test("text input keyboard typing and backspace", () => {
    const mockFont = createMockFont();
    let textInput!: TextInput;

    const rivet = new HeadlessRivet((context) => {
      textInput = new TextInput(
        context.manager,
        { x: 40, y: 40 },
        120,
        16
      );

      const container = new BaseWidget(context.manager, { x: 0, y: 0, width: 256, height: 192 });
      container.addWidget(textInput);
      context.manager.setApplicationWidget(container);

      return { draw: () => container.delegateDraw(context.drawer) };
    }, mockFont);

    // Without focus, typed characters should be ignored
    rivet.typeChar("Z");
    rivet.typeChar("Y");
    assert.strictEqual(textInput!.value, "");

    // Click inside the input to focus it
    rivet.click(50, 50);
    assert.strictEqual(textInput!.focused, true);

    rivet.typeChar("A");
    rivet.typeChar("B");
    assert.strictEqual(textInput!.value, "AB");

    rivet.keyDown(8); // backspace
    assert.strictEqual(textInput!.value, "A");
  });

  test("prompt service confirm resolves based on button clicks", async () => {
    const mockFont = createMockFont();
    let root!: BaseWidget;

    const rivet = new HeadlessRivet((context) => {
      root = new BaseWidget(context.manager, { x: 0, y: 0, width: 256, height: 192 });
      context.manager.setApplicationWidget(root);
      context.manager.requestFocus(root);
      return { draw: () => root.delegateDraw(context.drawer) };
    }, mockFont);

    const manager = rivet.getManager();

    const clickModalButton = (index: number) => {
      const modal = manager.getModalWidget();
      assert.ok(modal, "modal should be active");
      const children = modal.getChildren();
      assert.ok(children[index], "modal button missing");

      const button = children[index] as Widget;
      const clickX = modal.rect.x + button.rect.x + Math.floor(button.rect.width / 2);
      const clickY = modal.rect.y + button.rect.y + Math.floor(button.rect.height / 2);
      rivet.click(clickX, clickY);
    };

    const okPromise = manager.prompts.confirm("Proceed with action?");
    assert.strictEqual(manager.getModalWidget()?.constructor.name, "ConfirmModal");

    clickModalButton(1); // OK button is added second
    const okResult = await okPromise;
    assert.strictEqual(okResult, true);
    assert.strictEqual(manager.getModalWidget(), undefined);
    assert.strictEqual(manager.getFocusedWidget(), root);

    manager.requestFocus(root);
    const cancelPromise = manager.prompts.confirm("Cancel this step?");
    clickModalButton(0); // Cancel button is first
    const cancelResult = await cancelPromise;
    assert.strictEqual(cancelResult, false);
    assert.strictEqual(manager.getModalWidget(), undefined);
    assert.strictEqual(manager.getFocusedWidget(), root);
  });
});

describe("Integration with Manager", () => {
  test("should route events through hit testing with nested widgets", () => {
    const mockFont = createMockFont();
    let nestedButtonClicked = false;

    const rivet = new HeadlessRivet((context) => {
      // Create a nested structure: container > inner container > button
      const button = new TextButton(
        context.manager,
        { x: 10, y: 10, width: 80, height: 30 },
        "Nested",
        () => { nestedButtonClicked = true; }
      );

      const innerContainer = new BaseWidget(context.manager, { x: 50, y: 50, width: 150, height: 100 });
      innerContainer.addWidget(button);

      const outerContainer = new BaseWidget(context.manager, { x: 0, y: 0, width: 256, height: 192 });
      outerContainer.addWidget(innerContainer);

      context.manager.setApplicationWidget(outerContainer);

      return { draw: () => outerContainer.delegateDraw(context.drawer) };
    }, mockFont);

    // Click the nested button - coords are absolute screen coords
    // button is at: outer(0,0) + inner(50,50) + button(10,10) = (60, 60) + center offset
    rivet.click(100, 75);

    assert.strictEqual(nestedButtonClicked, true);
  });

  test("should support modal with real widgets", () => {
    const mockFont = createMockFont();
    let modalButtonClicked = false;
    let appButtonClicked = false;

    const rivet = new HeadlessRivet((context) => {
      // Main app with button
      const appButton = new TextButton(
        context.manager,
        { x: 10, y: 10, width: 80, height: 30 },
        "App Button",
        () => { appButtonClicked = true; }
      );
      const app = new BaseWidget(context.manager, { x: 0, y: 0, width: 256, height: 192 });
      app.addWidget(appButton);

      // Modal with button
      const modalButton = new TextButton(
        context.manager,
        { x: 10, y: 10, width: 80, height: 30 },
        "Modal Button",
        () => { modalButtonClicked = true; }
      );
      const modal = new BaseWidget(context.manager, { x: 50, y: 50, width: 150, height: 100 });
      modal.addWidget(modalButton);

      context.manager.setApplicationWidget(app);
      context.manager.setModal(modal);

      return {
        draw: () => {
          app.delegateDraw(context.drawer);
          modal.delegateDraw(context.drawer);
        }
      };
    }, mockFont);

    // Modal is present
    assert.notEqual(rivet.getManager().getModalWidget(), undefined);

    // Click modal button - should work
    rivet.click(90, 75);
    assert.strictEqual(modalButtonClicked, true);

    // Click app button behind modal - should be blocked by modal
    rivet.click(50, 25);
    assert.strictEqual(appButtonClicked, false);
  });

  test("debug log viewer text overflow", async () => {
    const realFont = await loadRealFont();
    const rivet = new HeadlessRivet(logViewerApplication, realFont);

    // Draw the UI
    rivet.draw();

    // Add multiple log entries with varying lengths
    for (let i = 0; i < 3; i++) {
      const randomId = Math.floor(Math.random() * 10000);
      rivet.getManager().log.write(
        `2024-01-15T14:30:${String(i).padStart(2, "0")} • This is a sample log entry with random ID ${randomId} to demonstrate text wrapping and clamping behavior #${i}`
      );
    }
    rivet.draw();
    
    console.log("\n=== Logs With Entries ===");
    rivet.printLogs();
    console.log("==========================\n");

    await saveSnapshot(rivet, "log-viewer-debug");

    assert.ok(rivet.getManager());
  });
});
