// Logger - Structured Logging for Production Monitoring
// Provides consistent, searchable logs with proper levels and context

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  [key: string]: any;
}

export class Logger {
  private serviceName: string;
  private minLevel: LogLevel;

  constructor(serviceName: string, minLevel: LogLevel = 'INFO') {
    this.serviceName = serviceName;
    this.minLevel = minLevel;
  }

  debug(message: string, context: LogContext = {}): void {
    this.log('DEBUG', message, context);
  }

  info(message: string, context: LogContext = {}): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context: LogContext = {}): void {
    this.log('WARN', message, context);
  }

  error(message: string, context: LogContext = {}): void {
    this.log('ERROR', message, context);
  }

  private log(level: LogLevel, message: string, context: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...context
    };

    // Use appropriate console method based on level
    switch (level) {
      case 'DEBUG':
        console.debug(JSON.stringify(logEntry));
        break;
      case 'INFO':
        console.info(JSON.stringify(logEntry));
        break;
      case 'WARN':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'ERROR':
        console.error(JSON.stringify(logEntry));
        break;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      'DEBUG': 0,
      'INFO': 1,
      'WARN': 2,
      'ERROR': 3
    };

    return levels[level] >= levels[this.minLevel];
  }

  // Create a child logger with additional context
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.serviceName, this.minLevel);
    
    // Override log method to include parent context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, childContext: LogContext) => {
      originalLog(level, message, { ...context, ...childContext });
    };

    return childLogger;
  }
}