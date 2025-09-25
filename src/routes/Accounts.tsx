import React from 'react'
import { db, Account } from '../lib/db'

export default function Accounts(){
  const [rows,setRows]=React.useState<Account[]>([])
  const [name,setName]=React.useState(''); const [type,setType]=React.useState<'cheque'|'savings'|'cash'|'credit'|'loan'|'bond'>('cheque')
  const [last4,setLast4]=React.useState('')

  React.useEffect(()=>{ db.accounts.toArray().then(setRows)},[])
  async function add(){
    await db.accounts.add({ name, type, last4 })
    setName(''); setLast4('')
    setRows(await db.accounts.toArray())
  }
  return (
    <div className="grid gap-4">
      <div className="card">
        <h3 className="font-semibold mb-3">Accounts</h3>
        <ul className="space-y-2">
          {rows.map(a=>(<li key={a.id} className="flex justify-between"><div>{a.name} {a.last4?`•${a.last4}`:''}</div><div className="text-slate-500 text-sm">{a.type}</div></li>))}
          {!rows.length && <li className="text-slate-500 text-sm">No accounts yet.</li>}
        </ul>
      </div>
      <div className="card">
        <h4 className="font-semibold mb-2">Add Account</h4>
        <div className="grid sm:grid-cols-3 gap-2">
          <input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)}/>
          <select className="input" value={type} onChange={e=>setType(e.target.value as any)}>
            <option value="cheque">Cheque</option>
            <option value="savings">Savings</option>
            <option value="cash">Cash</option>
            <option value="credit">Credit</option>
            <option value="loan">Loan</option>
            <option value="bond">Bond</option>
          </select>
          <input className="input" placeholder="Last 4 (optional)" value={last4} onChange={e=>setLast4(e.target.value)}/>
        </div>
        <button className="btn mt-3" onClick={add}>Add</button>
      </div>
    </div>
  )
}