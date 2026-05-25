import { ConsoleLogger } from '@nestjs/common';

export class InternalLogFilter extends ConsoleLogger {
  static contextsToIgnore = [
    'InstanceLoader',
    'RoutesResolver',
    'RouterExplorer',
    'WebSocketsController',
  ];

  private allowedLogLevels: string[];

  constructor() {
    super();
    const isProduction = process.env.NODE_ENV === 'production';
    const isDebugMode = process.env.DEBUG_MODE === 'true';
    
    if (isProduction && !isDebugMode) {
      this.allowedLogLevels = ['log', 'error', 'fatal'];
    } else {
      this.allowedLogLevels = ['log', 'debug', 'verbose', 'warn', 'error', 'fatal'];
    }
  }

  private isLogLevelAllowed(level: string): boolean {
    return this.allowedLogLevels.includes(level);
  }

  log(_message: any, context?: string): void {
    if (
      this.isLogLevelAllowed('log') &&
      (process.env.NODE_ENV !== 'production' ||
        !InternalLogFilter.contextsToIgnore.includes(context))
    ) {
      super.log.apply(this, arguments);
    }
  }

  warn(_message: any, _context?: string): void {
    if (this.isLogLevelAllowed('warn')) {
      super.warn.apply(this, arguments);
    }
  }

  error(_message: any, _stack?: string, _context?: string): void {
    if (this.isLogLevelAllowed('error')) {
      super.error.apply(this, arguments);
    }
  }

  debug(_message: any, _context?: string): void {
    if (this.isLogLevelAllowed('debug')) {
      super.debug.apply(this, arguments);
    }
  }

  verbose(_message: any, _context?: string): void {
    if (this.isLogLevelAllowed('verbose')) {
      super.verbose.apply(this, arguments);
    }
  }
}
