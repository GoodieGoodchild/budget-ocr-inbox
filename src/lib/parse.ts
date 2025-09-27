export type Parsed = {
  amount?: number
  date?: string
  merchant?: string
  type?: 'expense'|'income'|'transfer'|'debt_payment'
  bank?: string
  last4?: string
  balance?: number
}

const num = (s:string)=>  parseFloat(s.replace(/[ \u00A0,]/g, '').replace(',', '.')); // strip spaces/commas, normalize comma decimal
//const AMOUNT = /(?:R|ZAR)\s?([0-9]{1,3}(?:[ ,][0-9]{3})*(?:\.[0-9]{2})?)/i
const AMOUNT_G = /\b(?:R|ZAR)\s*([0-9]{1,3}(?:[ ,]\d{3})*|\d+)(?:[.,]\d{2})?\b/gi
          // either grouped thousands or any length of digits
                   // optional decimal with comma or dot, allow stray spaces from OCR

const BAL = /(avail(?:able)?\s*bal(?:ance)?|balance|bal)\W*(?:R|ZAR)?\s?([0-9]{1,3}(?:[ ,][0-9]{3})*(?:\.[0-9]{2})?)/i
const DATE = /(\d{4}-\d{2}-\d{2}|\d{2}[\/-]\d{2}[\/-]\d{4}|\d{1,2}\s\w{3}\s\d{4})/
const LAST4 = /(?:\*{2,}|xxxx|x{4,}|acct\s*\*?)\s*(\d{3,4})/i
const HAS_AMOUNT = /(?:R|ZAR)\s*(\d{1,3}(?:[ ,]\d{3})*|\d+)(?:[.,]\d{2})?/i
const INCOME_HINT = /(salary|credit from|eft from|paid by|deposit)/i
const EXPENSE_HINT = /(pos|purchase|card|debit|fee|deducted|payment at)/i
const TRANSFER_HINT = /(eft to|transfer to|internal transfer)/i
const DEBT_HINT = /(credit card|min(imum)? payment|installment|instalment)/i
const MONTH_ABBR = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 } as const
const D_MON = /\b(\d{1,2})\s*([A-Za-z]{3})(?:[^\d]|$)/


function clean(s: string) { return s.replace(/\s+/g, ' ').trim() }

// Normalize things like "18Sep" → "YYYY-09-18" (assume current year if missing)
export function normalizeDayMon(raw: string) {
  const m = raw.match(D_MON)
  if (!m) return ''
  const d = String(m[1]).padStart(2,'0')
  const mon3 = m[2].toLowerCase() as keyof typeof MONTH_ABBR
  const mon = MONTH_ABBR[mon3]; if (!mon) return ''
  const y = String(new Date().getFullYear())
  return `${y}-${String(mon).padStart(2,'0')}-${d}`
}

export function parseText(text:string): Parsed {
  const p: Parsed = {}
  const amt = text.match(AMOUNT_G); if(amt) p.amount = num(amt[1])
  const bal = text.match(BAL); if(bal) p.balance = num(bal[2])
  const dt = text.match(DATE); if(dt) p.date = normalizeDate(dt[1])
  const l4 = text.match(LAST4); if(l4) p.last4 = l4[1]

  if(INCOME_HINT.test(text)) p.type = 'income'
  else if(TRANSFER_HINT.test(text)) p.type = 'transfer'
  else if(DEBT_HINT.test(text)) p.type = 'debt_payment'
  else if(EXPENSE_HINT.test(text)) p.type = 'expense'

  // crude merchant: take words after 'at ' or 'from '
  const m = text.match(/(?:at|from)\s+([A-Za-z0-9 &._-]{2,40})/i)
  if(m) p.merchant = m[1].trim()

  // bank guess
  if(/nedbank/i.test(text)) p.bank = 'Nedbank'
  if(/fnb|first national bank/i.test(text)) p.bank = 'FNB'

  return p
}

// NEW robust multi parser: scans the whole blob for every amount,
// builds a small text window around each hit, and reuses parseText on that window.
export function parseMany(text: string): ReturnType<typeof parseText>[] {
  const out: ReturnType<typeof parseText>[] = []

  // 1) Global scan for every amount occurrence
  let m: RegExpExecArray | null
  while ((m = AMOUNT_G.exec(text)) !== null) {
    // Take ~120 chars before & after the amount as context
    const start = Math.max(0, m.index - 120)
    const end   = Math.min(text.length, AMOUNT_G.lastIndex + 120)
    const ctx   = clean(text.slice(start, end))

    // 2) Parse that window with your single-record parser
    const p = parseText(ctx)

    // 3) If date missing, try to pull a "18Sep" style date from the same window
    if (!p.date) {
      const dmon = ctx.match(D_MON)
      if (dmon) p.date = normalizeDayMon(dmon[0])
    }

    // 4) Only keep if we got an amount
    if (p.amount != null) out.push(p)
  }

  // Fallback: if we somehow saw only one, try splitting on common SMS headers
  if (out.length <= 1) {
    const chunks = text.split(/(?=FNB\s*:\-\)|Nedbank|Standard Bank|Capitec|ABSA)/i).map(clean).filter(Boolean)
    for (const c of chunks) {
      const p = parseText(c)
      if (!p.date) {
        const dmon = c.match(D_MON)
        if (dmon) p.date = normalizeDayMon(dmon[0])
      }
      if (p.amount != null) out.push(p)
    }
  }

  // De-dupe by (date|amount|merchant)
  const seen = new Set<string>()
  return out.filter(p => {
    const key = [p.date || '', p.amount ?? '', (p.merchant || '').toLowerCase()].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}



// NEW: normalize things like "••1234", "xxxx 1234", "*1234" -> "1234"
export function normalizeLast4(s?: string | null) {
  if (!s) return ''
  const digits = (s.match(/\d{4}/g) || []).pop() // take the last 4-digit group if multiple
  return digits || ''
}


function normalizeDate(raw:string){
  if(/\d{4}-\d{2}-\d{2}/.test(raw)) return raw
  if(/\d{2}[\/]-?\d{2}[\/]-?\d{4}/.test(raw)){
    const [d,m,y] = raw.replace(/-/g,'/').split('/')
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  }
  // e.g., 22 Sep 2025
  const parts = raw.split(' ')
  const d = parts[0].padStart(2,'0')
  const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  const mi = month.indexOf(parts[1].slice(0,3).toLowerCase())+1
  const m = String(mi).padStart(2,'0')
  const y = parts[2]
  return `${y}-${m}-${d}`
}

