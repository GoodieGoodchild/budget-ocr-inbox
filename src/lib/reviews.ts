// src/lib/reviews.ts
import { db, AppSettings, ReviewEntry } from './db'

export function getWeekRange(now = new Date(), weekStartDay: number = 0) {
  const d = new Date(now)
  const currentDay = d.getDay()
  const diff = (currentDay - weekStartDay + 7) % 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - diff)
  const start = new Date(d)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end, startISO: start.toISOString().slice(0,10), endISO: end.toISOString().slice(0,10) }
}

export async function getSettings(): Promise<AppSettings> {
  return (await db.settings.get(1)) ?? {
    id: 1, reminderCadence: 'weekly', reviewDay: 0, reviewHour: 19,
    quietHours: { start: '21:00', end: '07:00' }
  }
}

// NEW: money formatter
import { fmtMoney } from './format'

// NEW: summarize transactions in a date range (inclusive)
export async function summarizeWeek(startISO: string, endISO: string) {
  // Pull all transactions in the date range
  const tx = await db.transactions
    .where('date').between(startISO, endISO, true, true)
    .toArray()

  // Totals
  let incomeTotal = 0
  let spendingTotal = 0

  // Buckets by category name
  const byCategory: Record<string, number> = {}

  // Extras we want to call out explicitly
  let debtPaymentsTotal = 0
  let savingsTotal = 0

  // Load categories into a lookup
  const cats = await db.categories.toArray()
  const catNameById = new Map(cats.map(c => [c.id!, c.name]))

  for (const t of tx) {
    const amt = t.amount || 0
    const catName = t.categoryId ? (catNameById.get(t.categoryId) || 'Uncategorized') : 'Uncategorized'

    // Sum by category
    byCategory[catName] = (byCategory[catName] || 0) + amt

    // Income vs spending
    if (amt > 0) incomeTotal += amt
    if (amt < 0) spendingTotal += amt

    // Highlights
    if (t.type === 'debt_payment' || /Debt Repayments/i.test(catName)) {
      debtPaymentsTotal += Math.abs(amt)
    }
    if (/Savings\/Goals/i.test(catName)) {
      savingsTotal += Math.max(0, amt) // only count positive contributions
    }
  }

  // Make a top-3 spending list (largest negative totals)
  const topSpending = Object.entries(byCategory)
    .filter(([,v]) => v < 0)
    .sort((a,b) => a[1] - b[1])  // most negative first
    .slice(0, 3)
    .map(([name, total]) => ({ name, total }))

  return {
    incomeTotal,
    spendingTotal,            // negative number; use Math.abs(...) when displaying
    byCategory,
    topSpending,
    debtPaymentsTotal,
    savingsTotal,
  }
}


export async function draftWeeklyReview(weekStartISO: string): Promise<ReviewEntry> {
  // Compute this week's end date from the given start
  const start = new Date(weekStartISO + 'T00:00:00')
  const end = new Date(start); end.setDate(end.getDate() + 6)
  const endISO = end.toISOString().slice(0, 10)

  // Spend/Income/Category rollup
  const sum = await summarizeWeek(weekStartISO, endISO)

  // Build a short human summary (rule-based, no AI call)
  const incomeStr = fmtMoney(sum.incomeTotal)
  const spendStr  = fmtMoney(Math.abs(sum.spendingTotal))
  const debtStr   = fmtMoney(sum.debtPaymentsTotal)
  const saveStr   = fmtMoney(sum.savingsTotal)

  let highlights = ''
  if (sum.topSpending.length) {
    const parts = sum.topSpending.map(({name, total}) => `${name} ${fmtMoney(Math.abs(total))}`)
    highlights = ` Top spending: ${parts.join(', ')}.`
  }

  const title = `Weekly Review · ${weekStartISO} → ${endISO}`
  const summary =
    `You received ${incomeStr} and spent ${spendStr} this week.` +
    ` Debt payments: ${debtStr}. Savings added: ${saveStr}.` +
    highlights

  // Simple metrics for the card footer
  const metrics = {
    totalContrib: sum.savingsTotal + sum.debtPaymentsTotal, // positive numbers
    goalsHit: 0,     // (we’ll populate this when goals/clues logic is wired)
    newClues: 0,
  }

  return {
    weekStart: weekStartISO,
    createdAt: new Date().toISOString(),
    title,
    summary,
    metrics,
  }
}


export async function maybeRunWeeklyReview(): Promise<boolean> {
  const settings = await getSettings()
  if (settings.reminderCadence !== 'weekly') return false
  const now = new Date()
  const { start, startISO } = getWeekRange(now, settings.reviewDay)
  const scheduled = new Date(start); scheduled.setHours(settings.reviewHour ?? 19, 0, 0, 0)
  if (now < scheduled) return false
  const existing = await db.reviews.where('weekStart').equals(startISO).first()
  if (existing) return false
  const draft = await draftWeeklyReview(startISO)
  const id = await db.reviews.add(draft)
  await db.settings.put({ ...settings, lastReviewAt: new Date().toISOString() })
  return !!id
}
