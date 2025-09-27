import React from 'react'
import { Account, db } from '../lib/db'
import { toCSV, downloadCSV } from '../lib/csv'

// Minimal shape coming from parseText/parseMany
export type ParsedLite = {
  date?: string
  amount?: number
  type?: 'expense'|'income'|'transfer'|'debt_payment'|string
  merchant?: string
  last4?: string
  bank?: string
  accountId?: number
}

type Props = {
  rows: ParsedLite[]
  accounts: Account[]
  onDone: () => void           // called after Accept or Close
}

export default function MultiPreview({ rows, accounts, onDone }: Props) {
  const [draft, setDraft] = React.useState<ParsedLite[]>(
    rows.map(r => ({ ...r })) // local editable copy
  )

  function setField(i: number, patch: Partial<ParsedLite>) {
    setDraft(d => d.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function exportCSV() {
    const csv = toCSV(
      draft.map(r => ({
        date: r.date || '',
        amount: r.amount ?? '',
        type: r.type || '',
        merchant: r.merchant || '',
        last4: r.last4 || '',
        bank: r.bank || '',
      })),
      ['date', 'amount', 'type', 'merchant', 'last4', 'bank']
    )
    downloadCSV(`vera-parsed-${Date.now()}.csv`, csv)
  }

  async function acceptAll() {
    for (const r of draft) {
      if (!r.amount || !r.date) continue
      await db.transactions.add({
        date: r.date,
        amount: Math.abs(r.amount) * (r.type === 'expense' || r.type === 'debt_payment' || r.type === 'transfer' ? -1 : 1),
        type: (r.type as any) || 'expense',
        accountId: r.accountId,
        merchant: r.merchant,
        note: '(multi-accept)'
      })
    }
    onDone()
  }

  return (
    <div className="card border-2 border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Detected multiple transactions</h3>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={exportCSV}>Export CSV</button>
          <button className="btn" onClick={acceptAll}>Accept all</button>
          <button className="btn-outline" onClick={onDone}>Close</button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1">Date</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Merchant</th>
              <th>Last-4</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            {draft.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="py-1">
                  <input className="input" type="date" value={r.date || ''} onChange={e => setField(i, { date: e.target.value })}/>
                </td>
                <td>
                  <input className="input" type="number" value={r.amount ?? ''} onChange={e => setField(i, { amount: e.target.value === '' ? undefined : parseFloat(e.target.value) })}/>
                </td>
                <td>
                  <select className="input" value={r.type || ''} onChange={e => setField(i, { type: e.target.value })}>
                    <option value="">Choose…</option>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                    <option value="debt_payment">Debt payment</option>
                  </select>
                </td>
                <td>
                  <input className="input" value={r.merchant || ''} onChange={e => setField(i, { merchant: e.target.value })}/>
                </td>
                <td>
                  <input className="input" value={r.last4 || ''} onChange={e => setField(i, { last4: e.target.value })}/>
                </td>
                <td>
                  <select
                    className="input"
                    value={r.accountId || ''}
                    onChange={e => setField(i, { accountId: e.target.value ? Number(e.target.value) : undefined })}
                  >
                    <option value="">Select…</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} {a.last4 ? `•${a.last4}` : ''}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
