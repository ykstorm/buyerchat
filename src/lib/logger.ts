// Production-safe logger.
// Suppresses console.error / console.warn in production to keep Vercel logs clean.
// Always logs in development.

const isProd = process.env.NODE_ENV === 'production'

export const logger = {
  info: (...args: unknown[]) => {
    if (!isProd) console.log('[INFO]', ...args)
  },
  warn: (...args: unknown[]) => {
    if (!isProd) console.warn('[WARN]', ...args)
  },
  error: (...args: unknown[]) => {
    // Always log errors — but in production, prefix for structured logging
    if (isProd) {
      console.error('[ERROR]', ...args)
    } else {
      console.error('[ERROR]', ...args)
    }
  },
  debug: (...args: unknown[]) => {
    if (!isProd) console.debug('[DEBUG]', ...args)
  },
}
