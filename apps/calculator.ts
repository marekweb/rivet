import type { SystemContextObject } from "../init";
import type { Manager } from "../manager";
import { type Point, centerRect, origin } from "../rect";
import {
  type WindowsInterfaceDrawer,
  black,
  darkBlue,
  mediumGray,
  teal,
  white,
} from "../screen";
import BaseWidget from "../widgets/BaseWidget";
import type Widget from "../widgets/Widget";
import type { WidgetEvent } from "../widgets/Widget";

export function calculatorApplication(context: SystemContextObject): {
  draw: (mouseLocation: Point, mouseDownLocation?: Point) => void;
} {
  const { screen, drawer, screenWidth, screenHeight } = context;

  const application = new CalculatorApp(context.manager);
  context.manager.setApplicationWidget(application);

  function draw() {
    // Draw the "desktop" background
    screen.drawRect(0, 0, screenWidth, screenHeight, teal);

    application.delegateDraw(drawer);
  }

  return { draw };
}

interface DynamicValue<T> {
  get(): T;
  set(value: T): void;
}

function createDynamicValue<T>(initialValue: T): DynamicValue<T> {
  let value = initialValue;
  return {
    get: () => value,
    set: (newValue: T) => {
      value = newValue;
    },
  };
}

class Display extends BaseWidget implements Widget {
  private display: DynamicValue<string>;

  constructor(
    manager: Manager,
    location: Point,
    display: DynamicValue<string>
  ) {
    super(manager, {
      x: location.x,
      y: location.y,
      width: 150,
      height: 30,
    });
    this.display = display;
  }

  draw(ui: WindowsInterfaceDrawer): void {
    // Draw display panel
    ui.drawPanel(0, 0, this.rect.width, this.rect.height, mediumGray);

    // Draw the text, right-aligned
    const text = this.display.get();
    const textWidth = ui.calculateTextWidthBinary(text);
    const textX = Math.max(5, this.rect.width - textWidth - 5);
    const textY = this.rect.height / 2 - 3;

    ui.drawText(text, textX, textY, undefined, undefined, black);
  }
}

class CalculatorButton extends BaseWidget implements Widget {
  private label: string;
  private clickHandler: () => void;
  private pressed = false;
  private mouseDownInside = false;

  constructor(
    manager: Manager,
    location: Point,
    width: number,
    height: number,
    label: string,
    clickHandler: () => void
  ) {
    super(manager, {
      x: location.x,
      y: location.y,
      width,
      height,
    });
    this.label = label;
    this.clickHandler = clickHandler;
  }

  handleEvent(event: WidgetEvent): void {
    if (event.type !== "mouse") {
      return;
    }

    const localRect = {
      x: 0,
      y: 0,
      width: this.rect.width,
      height: this.rect.height,
    };
    const mouseInside =
      event.location.x >= localRect.x &&
      event.location.x < localRect.x + localRect.width &&
      event.location.y >= localRect.y &&
      event.location.y < localRect.y + localRect.height;

    if (event.event === "down") {
      this.mouseDownInside = true;
      this.pressed = true;
      this.manager.requestCapture(this);
    } else if (event.event === "move") {
      // Only update pressed state if mouse was pressed down inside
      if (this.mouseDownInside) {
        this.pressed = mouseInside;
      }
    } else if (event.event === "up") {
      if (this.mouseDownInside && mouseInside) {
        this.clickHandler();
      }
      this.pressed = false;
      this.mouseDownInside = false;
    }
  }

  draw(ui: WindowsInterfaceDrawer): void {
    if (this.pressed) {
      ui.drawButtonPressed(0, 0, this.rect.width, this.rect.height);
    } else {
      ui.drawButton(0, 0, this.rect.width, this.rect.height);
    }

    // Draw button text centered
    const textWidth = ui.calculateTextWidthBinary(this.label);
    const textX = Math.floor((this.rect.width - textWidth) / 2);
    const textY = Math.floor((this.rect.height - 8) / 2) + 1;
    ui.drawText(this.label, textX, textY, undefined, undefined, black);
  }
}

class CalculatorApp extends BaseWidget implements Widget {
  private display: DynamicValue<string>;
  private currentValue = 0;
  private displayValue = "0";
  private operation: string | null = null;
  private newNumber = true;
  private windowWidth = 180;
  private windowHeight = 160;

  constructor(manager: Manager) {
    super(manager, { ...origin, ...manager.getScreenSize() });

    this.display = createDynamicValue("0");

    // Center the window
    const { x: windowX, y: windowY } = centerRect(
      { width: this.windowWidth, height: this.windowHeight },
      this.rect
    );
    this.rect.x = windowX;
    this.rect.y = windowY;
    this.rect.width = this.windowWidth;
    this.rect.height = this.windowHeight;

    // Create display
    const displayWidget = new Display(manager, { x: 10, y: 25 }, this.display);
    this.addWidget(displayWidget as unknown as Widget);

    // Create button grid
    const buttonWidth = 35;
    const buttonHeight = 18;
    const buttonSpacing = 2;
    const startX = 10;
    const startY = 58;

    const buttons: Array<[string, () => void]> = [
      ["7", () => this.numberPressed("7")],
      ["8", () => this.numberPressed("8")],
      ["9", () => this.numberPressed("9")],
      ["/", () => this.operationPressed("/")],
      ["4", () => this.numberPressed("4")],
      ["5", () => this.numberPressed("5")],
      ["6", () => this.numberPressed("6")],
      ["*", () => this.operationPressed("*")],
      ["1", () => this.numberPressed("1")],
      ["2", () => this.numberPressed("2")],
      ["3", () => this.numberPressed("3")],
      ["-", () => this.operationPressed("-")],
      ["0", () => this.numberPressed("0")],
      [".", () => this.decimalPressed()],
      ["=", () => this.equalsPressed()],
      ["+", () => this.operationPressed("+")],
    ];

    for (let i = 0; i < buttons.length; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = startX + col * (buttonWidth + buttonSpacing);
      const y = startY + row * (buttonHeight + buttonSpacing);

      const [label, handler] = buttons[i];
      const button = new CalculatorButton(
        manager,
        { x, y },
        buttonWidth,
        buttonHeight,
        label,
        handler
      );
      this.addWidget(button as unknown as Widget);
    }

    // Add clear button at bottom
    const clearButton = new CalculatorButton(
      manager,
      { x: startX, y: startY + 4 * (buttonHeight + buttonSpacing) + 2 },
      this.windowWidth - 20,
      buttonHeight,
      "Clear",
      () => this.clear()
    );
    this.addWidget(clearButton as unknown as Widget);
  }

  private numberPressed(digit: string): void {
    if (this.newNumber) {
      this.displayValue = digit;
      this.newNumber = false;
    } else {
      this.displayValue += digit;
    }
    this.display.set(this.displayValue);
  }

  private decimalPressed(): void {
    if (this.newNumber) {
      this.displayValue = "0.";
      this.newNumber = false;
    } else if (!this.displayValue.includes(".")) {
      this.displayValue += ".";
    }
    this.display.set(this.displayValue);
  }

  private operationPressed(op: string): void {
    const numValue = Number.parseFloat(this.displayValue);

    if (this.operation !== null) {
      // Calculate pending operation
      this.currentValue = this.calculate(
        this.currentValue,
        numValue,
        this.operation
      );
    } else {
      this.currentValue = numValue;
    }

    this.operation = op;
    this.newNumber = true;
    this.display.set(String(this.currentValue));
  }

  private equalsPressed(): void {
    if (this.operation === null) {
      return;
    }

    const numValue = Number.parseFloat(this.displayValue);
    this.currentValue = this.calculate(
      this.currentValue,
      numValue,
      this.operation
    );

    this.displayValue = String(this.currentValue);
    this.display.set(this.displayValue);
    this.operation = null;
    this.newNumber = true;
  }

  private calculate(a: number, b: number, op: string): number {
    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "*":
        return a * b;
      case "/":
        return b !== 0 ? a / b : 0;
      default:
        return a;
    }
  }

  private clear(): void {
    this.currentValue = 0;
    this.displayValue = "0";
    this.operation = null;
    this.newNumber = true;
    this.display.set("0");
  }

  draw(ui: WindowsInterfaceDrawer): void {
    // Draw the main window
    ui.drawWindow(0, 0, this.rect.width, this.rect.height);

    // Draw title bar
    ui.drawRect(3, 3, this.windowWidth - 6, 14, darkBlue);

    // Draw the title text
    ui.drawText("Calculator", 7, 6, undefined, undefined, white, true);
  }
}
