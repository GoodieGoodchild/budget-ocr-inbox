import React from 'react'
import { db, Transaction } from '../lib/db'
import { fmtMoney } from '../lib/format'

export default function Transactions(){
  const [rows,setRows]=React.useState<Transaction[]>([])
  React.useEffect(()=>{ db.transactions.orderBy('date').reverse().toArray().then(setRows)},[])
  return (
    <div className="card">
      <h3 className="font-semibold mb-3">All Transactions</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1">Date</th><th>Type</th><th>Merchant/Note</th><th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id} className="border-t">
              <td className="py-1">{r.date}</td>
              <td>{r.type}</td>
              <td>{r.merchant||r.note||''}</td>
              <td className="text-right">{fmtMoney(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}