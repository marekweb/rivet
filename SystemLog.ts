export const LOG_RETENTION_DEFAULT = 200;

export default class SystemLog {
  private logs: string[] = [];
  private retention: number;

  constructor(retention = LOG_RETENTION_DEFAULT) {
    this.retention = retention;
  }

  write(entry: string): void {
    this.logs.push(entry);
    if (this.logs.length > this.retention) {
      const overflow = this.logs.length - this.retention;
      this.logs.splice(0, overflow);
    }
  }

  read(): string[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}
