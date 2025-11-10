import type { Manager } from "../manager";
import type { Point } from "../rect";
import type { WindowsInterfaceDrawer } from "../screen";
import BaseWidget from "../widgets/BaseWidget";
import TextButton from "../widgets/TextButton";
import type Widget from "../widgets/Widget";
import type { WidgetEvent } from "../widgets/Widget";

export type ConfirmResult = {
  confirmed: boolean;
};

export interface ConfirmModalOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export class ConfirmModal extends BaseWidget implements Widget {
  private options: ConfirmModalOptions;
  private okButton: TextButton;
  private cancelButton: TextButton;
  private result: ConfirmResult | null = null;
  private resolvePromise: ((result: ConfirmResult) => void) | null = null;

  constructor(manager: Manager, options: ConfirmModalOptions = {}) {
    const screenSize = manager.getScreenSize();
    const modalWidth = 100;
    const modalHeight = 60;

    // Calculate centered position
    const x = Math.floor((screenSize.width - modalWidth) / 2);
    const y = Math.floor((screenSize.height - modalHeight) / 2);

    super(manager, { x, y, width: modalWidth, height: modalHeight });

    this.options = {
      title: "Confirm",
      message: "Are you sure?",
      confirmText: "OK",
      cancelText: "Cancel",
      ...options,
    };

    const buttonY = this.rect.height - 22; // 22px from bottom

    // Cancel button on the left
    this.cancelButton = new TextButton(
      manager,
      { x: 8, y: buttonY }, // relative to modal top-left
      this.options.cancelText || "Cancel",
      () => this.handleCancel()
    );

    // OK button on the right
    this.okButton = new TextButton(
      manager,
      { x: this.rect.width - 8 - 30, y: buttonY }, // 30px width for OK button, relative
      this.options.confirmText || "OK",
      () => this.handleConfirm()
    );

    this.addWidget(this.cancelButton);
    this.addWidget(this.okButton);
  }

  private handleConfirm(): void {
    this.result = { confirmed: true };
    if (this.options.onConfirm) {
      this.options.onConfirm();
    }
    this.dismiss();
  }

  private handleCancel(): void {
    this.result = { confirmed: false };
    if (this.options.onCancel) {
      this.options.onCancel();
    }
    this.dismiss();
  }

  private dismiss(): void {
    if (this.resolvePromise && this.result) {
      this.resolvePromise(this.result);
    }
    this.manager.clearModal();
  }

  // Method to show the modal and return a promise
  show(): Promise<ConfirmResult> {
    if (this.manager.getModalWidget()) {
      throw new Error("Cannot show ConfirmModal while another modal is active");
    }

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      // Set ourselves as the modal overlay
      this.manager.setModal(this);
    });
  }

  draw(ui: WindowsInterfaceDrawer): void {
    ui.drawWindow(0, 0, this.rect.width, this.rect.height);

    if (this.options.title) {
      ui.drawText(this.options.title, 8, 12);
    }

    if (this.options.message) {
      ui.drawText(this.options.message, 8, 28);
    }
  }
}

export async function showConfirmModal(
  manager: Manager,
  options: ConfirmModalOptions
): Promise<ConfirmResult> {
  const modal = new ConfirmModal(manager, options);
  return modal.show();
}
