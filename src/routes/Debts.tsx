import React from 'react'
import { db, Debt } from '../lib/db'

export default function Debts(){
  const [rows,setRows]=React.useState<Debt[]>([])
  const [d,setD]=React.useState<Debt>({name:'', balance:0, apr:0, minPayment:0})

  React.useEffect(()=>{ db.debts.toArray().then(setRows)},[])
  async function add(){
    await db.debts.add(d)
    setD({name:'', balance:0, apr:0, minPayment:0})
    setRows(await db.debts.toArray())
  }
  return (
    <div className="grid gap-4">
      <div className="card">
        <h3 className="font-semibold mb-3">Debts</h3>
        <ul className="space-y-2">
          {rows.map(x=>(<li key={x.id} className="flex justify-between"><div>{x.name}</div><div className="text-slate-500 text-sm">{x.apr}% · R{x.balance}</div></li>))}
          {!rows.length && <li className="text-slate-500 text-sm">No debts yet.</li>}
        </ul>
      </div>
      <div className="card">
        <h4 className="font-semibold mb-2">Add Debt</h4>
        <div className="grid sm:grid-cols-4 gap-2">
          <input className="input" placeholder="Name" value={d.name} onChange={e=>setD({...d,name:e.target.value})}/>
          <input className="input" type="number" placeholder="Balance" value={d.balance} onChange={e=>setD({...d,balance:parseFloat(e.target.value)})}/>
          <input className="input" type="number" placeholder="APR %" value={d.apr} onChange={e=>setD({...d,apr:parseFloat(e.target.value)})}/>
          <input className="input" type="number" placeholder="Min Payment" value={d.minPayment} onChange={e=>setD({...d,minPayment:parseFloat(e.target.value)})}/>
        </div>
        <button className="btn mt-3" onClick={add}>Add</button>
      </div>
    </div>
  )
}