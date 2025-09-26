// src/routes/Reviews.tsx
import React from 'react'
import { db, ReviewEntry } from '../lib/db'

export default function Reviews() {
  const [rows, setRows] = React.useState<ReviewEntry[]>([])

  React.useEffect(() => {
    // Load reviews ordered by most recent week first
    db.reviews.orderBy('weekStart').reverse().toArray().then(setRows)
  }, [])

  return (
    <div className="grid gap-4">
      <div className="card">
        <h3 className="font-semibold mb-3">Weekly Reviews</h3>

        {!rows.length && (
          <div className="text-slate-500 text-sm">
            No reviews yet.
          </div>
        )}

        <div className="grid gap-3">
          {rows.map(r => (
            <div key={r.id} className="border rounded-xl p-3">
              <div className="text-sm text-slate-500">
                {new Date(r.createdAt).toLocaleString()}
              </div>
              <div className="font-semibold">{r.title}</div>
              <p className="text-sm mt-1">{r.summary}</p>

              {r.metrics && (
                <div className="text-xs text-slate-600 mt-2">
                  Total contributed: R{r.metrics.totalContrib ?? 0} •{' '}
                  Goals hit: {r.metrics.goalsHit ?? 0} •{' '}
                  New clues: {r.metrics.newClues ?? 0}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
