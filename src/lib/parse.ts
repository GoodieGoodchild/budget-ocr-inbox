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
const AMOUNT = /(?:R|ZAR)\s*((?:\d{1,3}(?:[ ,]\d{3})+|\d+)(?:\s*[.,]\s*\d{2})?)/i;
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

function clean(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

export function parseText(text:string): Parsed {
  const p: Parsed = {}
  const amt = text.match(AMOUNT); if(amt) p.amount = num(amt[1])
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

export function parseMany(text: string): ReturnType<typeof parseText>[] {
  const lines = text.split(/\r?\n/).map(l => clean(l)).filter(Boolean)
  const out: ReturnType<typeof parseText>[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!HAS_AMOUNT.test(line)) continue

    // context = this line plus a neighbor above and below
    const ctx = clean([lines[i-1], line, lines[i+1]].filter(Boolean).join(' · '))

    const parsed = parseText(ctx)

    // if parseText didn’t find a date, peek at neighbor lines
    if (!parsed.date) {
      const prev = lines[i-1] || ''
      const next = lines[i+1] || ''
      const match = (prev.match(DATE) || next.match(DATE))?.[0]
      if (match) parsed.date = match // keep it raw or normalize if you already do
    }

    // if last4 missing, peek at neighbors
    if (!parsed.last4) {
      const prev2 = lines[i-2] || ''
      const l4m = (prev2.match(LAST4) || (lines[i-1] || '').match(LAST4) || line.match(LAST4))
      if (l4m) parsed.last4 = l4m[1]
    }

    if (parsed.amount != null) {
      out.push(parsed)
    }
  }

  // de-duplicate by date+amount+merchant
  const seen = new Set<string>()
  return out.filter(p => {
    const key = [p.date, p.amount, p.merchant].join('|').toLowerCase()
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

