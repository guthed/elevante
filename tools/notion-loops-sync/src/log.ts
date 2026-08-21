/** Enkel logger — nivå styrs av --verbose/--quiet. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export type Logger = {
  debug(msg: string, ...rest: unknown[]): void;
  info(msg: string, ...rest: unknown[]): void;
  warn(msg: string, ...rest: unknown[]): void;
  error(msg: string, ...rest: unknown[]): void;
  /** Rubrikrad utan nivåprefix. */
  plain(msg: string): void;
};

export function createLogger(min: LogLevel = 'info'): Logger {
  const enabled = (level: LogLevel) => ORDER[level] >= ORDER[min];
  return {
    debug: (msg, ...rest) => enabled('debug') && console.log(`  · ${msg}`, ...rest),
    info: (msg, ...rest) => enabled('info') && console.log(msg, ...rest),
    warn: (msg, ...rest) => enabled('warn') && console.warn(`⚠︎  ${msg}`, ...rest),
    error: (msg, ...rest) => enabled('error') && console.error(`✗  ${msg}`, ...rest),
    plain: (msg) => console.log(msg),
  };
}
