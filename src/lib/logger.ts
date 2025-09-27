import { db } from './db'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export async function writeLog(level: LogLevel, message: string, meta?: any) {
  const entry = { level, message, meta, ts: new Date().toISOString() }
  // console mirror
  console[level === 'error' ? 'error' : level]( `[Vera:${level}]`, message, meta || '' )
  // persist
  await db.logs.add(entry as any)
}

export const log = {
  debug: (m: string, meta?: any) => writeLog('debug', m, meta),
  info:  (m: string, meta?: any) => writeLog('info', m, meta),
  warn:  (m: string, meta?: any) => writeLog('warn', m, meta),
  error: (m: string, meta?: any) => writeLog('error', m, meta),
}

export function installGlobalErrorHandlers() {
  window.addEventListener('error', ev => {
    writeLog('error', 'window.onerror', { message: ev.message })
  })
  window.addEventListener('unhandledrejection', ev => {
    writeLog('error', 'unhandledrejection', { reason: (ev as any).reason })
  })
}
