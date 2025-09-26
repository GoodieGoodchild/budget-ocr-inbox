// src/lib/reviews.ts
import { db, AppSettings, ReviewEntry } from './db'

/**
 * Return the start-of-week (00:00) and end-of-week (23:59:59.999) for a given date,
 * using a custom week start day: 0=Sun .. 6=Sat (from settings.reviewDay).
 */
export function getWeekRange(now = new Date(), weekStartDay: number = 0) {
  const d = new Date(now) // copy
  // Move back to the desired week start day
  const currentDay = d.getDay() // 0..6
  const diff = (currentDay - weekStartDay + 7) % 7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - diff)
  const start = new Date(d)

  // End = start + 6 days, 23:59:59.999
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return {
    start,
    end,
    startISO: start.toISOString().slice(0, 10), // YYYY-MM-DD
    endISO: end.toISOString().slice(0, 10),
  }
}

/**
 * Helper: fetch settings (id=1). If missing, return sensible defaults.
 * We won't write anything here; ensureDefaultSettings() already creates the row.
 */
export async function getSettings(): Promise<AppSettings> {
  return (
    (await db.settings.get(1)) ??
    {
      id: 1,
      reminderCadence: 'weekly',
      reviewDay: 0,  // Sunday
      reviewHour: 19,
      quietHours: { start: '21:00', end: '07:00' },
    }
  )
}

/**
 * Placeholder: build a ReviewEntry object for a given week (no DB writes yet).
 * We’ll flesh this out in a later change.
 */
export async function draftWeeklyReview(weekStartISO: string): Promise<ReviewEntry> {
  const weekStart = weekStartISO
  const title = `Weekly Review · ${weekStart}`
  return {
    weekStart,
    createdAt: new Date().toISOString(),
    title,
    summary: 'Draft review (placeholder) — generator to be implemented.',
    metrics: { totalContrib: 0, goalsHit: 0, newClues: 0 },
  }
}

// Decide if a weekly review should be created for the current week.
// Returns true if a new review was written, false otherwise.
export async function maybeRunWeeklyReview(): Promise<boolean> {
  const settings = await getSettings()
  if (settings.reminderCadence !== 'weekly') return false

  const now = new Date()
  const { start, startISO } = getWeekRange(now, settings.reviewDay)

  // Scheduled time this week = weekStart + reviewHour
  const scheduled = new Date(start)
  scheduled.setHours(settings.reviewHour ?? 19, 0, 0, 0)

  // If it's not yet the scheduled time, do nothing.
  if (now < scheduled) return false

  // If we already created a review for this week, skip.
  const existing = await db.reviews.where('weekStart').equals(startISO).first()
  if (existing) return false

  // Draft a placeholder (we'll flesh out the real generator later)
  const draft = await draftWeeklyReview(startISO)
  const id = await db.reviews.add(draft)

  // Update settings.lastReviewAt for bookkeeping
  await db.settings.put({ ...settings, lastReviewAt: new Date().toISOString() })

  return !!id
}

