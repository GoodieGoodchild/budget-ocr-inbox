import React from 'react'
import { db, Transaction } from '../lib/db'
import { fmtMoney } from '../lib/format'

export default function Overview(){
  const [tx,setTx]=React.useState<Transaction[]>([])
  const [sum,setSum]=React.useState(0)
  React.useEffect(()=>{
    db.transaction('r', db.transactions, async ()=>{
      const all = await db.transactions.orderBy('date').reverse().limit(20).toArray()
      setTx(all)
      setSum(all.reduce((a,t)=>a+(t.amount||0),0))
    })
  },[])
  return (
    <div className="grid gap-4">
      <div className="card">
        <div className="text-slate-600">Last 20 transactions total</div>
        <div className="text-3xl font-bold">{fmtMoney(sum)}</div>
      </div>
      <div className="card">
        <h3 className="font-semibold mb-2">Recent</h3>
        <div className="divide-y">
          {tx.map(t=>(
            <div key={t.id} className="py-2 flex justify-between text-sm">
              <div>{t.date} · {t.type}</div>
              <div className={t.amount<0?'text-red-600':'text-green-600'}>{fmtMoney(t.amount)}</div>
            </div>
          ))}
          {!tx.length && <div className="text-slate-500 text-sm">No data yet — try the Inbox.</div>}
        </div>
      </div>
    </div>
  )
}