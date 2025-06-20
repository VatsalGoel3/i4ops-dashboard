export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  constructor(private service: string) {}

  private log(level: LogLevel, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: LogLevel[level],
      service: this.service,
      message,
      ...(meta && { meta })
    };

    // In production, send to proper logging service (DataDog, CloudWatch, etc.)
    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: any): void {
    this.log(LogLevel.ERROR, message, { error: error?.message || error });
  }
} 