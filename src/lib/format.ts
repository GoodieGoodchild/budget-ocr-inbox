export const ZAR = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })
export function fmtMoney(n?: number){ return ZAR.format(n ?? 0) }
export function todayISO(){ return new Date().toISOString().slice(0,10) }