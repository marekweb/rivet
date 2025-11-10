import type { Manager } from "./manager";
import { ConfirmModal } from "./widgets/ConfirmModal";

export class PromptService {
  private readonly manager: Manager;

  constructor(manager: Manager) {
    this.manager = manager;
  }

  async confirm(message: string): Promise<boolean> {
    if (this.manager.getModalWidget()) {
      throw new Error("Cannot show confirm modal while another modal is active");
    }

    const previousFocus = this.manager.getFocusedWidget();
    const modal = new ConfirmModal(this.manager, {
      title: "Confirm",
      message,
    });

    const modalPromise = modal.show();
    this.manager.requestFocus(modal);

    try {
      const result = await modalPromise;
      return result.confirmed;
    } finally {
      if (previousFocus && previousFocus !== modal) {
        this.manager.requestFocus(previousFocus);
      } else if (this.manager.getFocusedWidget() === modal) {
        this.manager.releaseFocus(modal);
      }
    }
  }
}

export default PromptService;
