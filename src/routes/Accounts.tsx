import React from 'react'
import { db, Account } from '../lib/db'

export default function Accounts(){
  const [rows,setRows]=React.useState<Account[]>([])
  const [name,setName]=React.useState(''); const [type,setType]=React.useState<'cheque'|'savings'|'cash'|'credit'|'loan'|'bond'>('cheque')
  const [last4,setLast4]=React.useState('')
  // ADD: inline edit state
  const [editId, setEditId] = React.useState<number | null>(null)
  const [editAcc, setEditAcc] = React.useState<Partial<Account>>({})


  React.useEffect(()=>{ db.accounts.toArray().then(setRows)},[])
  async function add(){
    await db.accounts.add({ name, type, last4 })
    setName(''); setLast4('')
    setRows(await db.accounts.toArray())
  }

  // ADD: start/cancel/save edit handlers
  function startEdit(a: Account) {
    setEditId(a.id!)
    setEditAcc({ ...a }) // clone
  }

  function cancelEdit() {
    setEditId(null)
    setEditAcc({})
  }

  async function saveEdit() {
    if (editId == null) return
    await db.accounts.update(editId, editAcc)
    setEditId(null)
    setEditAcc({})
    setRows(await db.accounts.toArray())
  }

  // ADD: close/reopen toggle
  async function toggleClosed(a: Account) {
    const today = new Date().toISOString().slice(0,10)
    const patch: Partial<Account> = a.isClosed
      ? { isClosed: false, closedAt: undefined }   // reopen
      : { isClosed: true,  closedAt: a.closedAt ?? today } // close
    await db.accounts.update(a.id!, patch)
    setRows(await db.accounts.toArray())
  }


  return (
    <div className="grid gap-4">
      <div className="card">
        <h3 className="font-semibold mb-3">Accounts</h3>
          <ul className="space-y-2">
            {rows.map(a=>(
              <li key={a.id} className="flex flex-col gap-2 border rounded-xl p-3">
                {editId === a.id ? (
                  // EDIT MODE
                  <div className="grid sm:grid-cols-6 gap-2">
                    {/* Name */}
                    <label className="text-xs text-slate-500">Bank / Account Name</label>
                    <input
                      className="input"
                      placeholder="Name"
                      value={editAcc.name as string || ''}
                      onChange={e=>setEditAcc({...editAcc, name: e.target.value})}
                    />
                    {/* Type */}
                     <label className="text-xs text-slate-500">Account Type</label>
                    <select
                      className="input"
                      value={editAcc.type as any || 'cheque'}
                      onChange={e=>setEditAcc({...editAcc, type: e.target.value as Account['type']})}
                    >
                      <option value="cheque">Cheque</option>
                      <option value="savings">Savings</option>
                      <option value="cash">Cash</option>
                      <option value="credit">Credit</option>
                      <option value="loan">Loan</option>
                      <option value="bond">Bond</option>
                    </select>
                    {/* Last 4 */}
                    <label className="text-xs text-slate-500">Card / Account Last 4</label>
                    <input
                      className="input"
                      placeholder="Card last 4 / acct suffix"
                      value={editAcc.last4 || ''}
                      onChange={e=>setEditAcc({...editAcc, last4: e.target.value})}
                    />
                    {/* Balance */}
                    <label className="text-xs text-slate-500">Balance</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="Balance (optional)"
                      value={editAcc.balance ?? ''}
                      onChange={e=>setEditAcc({...editAcc, balance: e.target.value===''? undefined : parseFloat(e.target.value)})}
                    />
                    {/* OpenedAt */}
                    <label className="text-xs text-slate-500">Opened At</label>
                    <input
                      className="input"
                      type="date"
                      value={(editAcc.openedAt || '').slice(0,10)}
                      onChange={e=>setEditAcc({...editAcc, openedAt: e.target.value})}
                    />
                    {/* ClosedAt (sets isClosed automatically if filled) */}
                    <label className="text-xs text-slate-500">Closed At</label>
                    <input
                      className="input"
                      type="date"
                      value={(editAcc.closedAt || '').slice(0,10)}
                      onChange={e=>setEditAcc({...editAcc, closedAt: e.target.value || undefined, isClosed: !!e.target.value})}
                    />
                    <div className="sm:col-span-6 flex gap-2 justify-end">
                      <button className="btn" onClick={saveEdit}>Save</button>
                      <button className="btn-outline" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {a.name} {a.last4 ? `•${a.last4}` : ''}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {a.type} {a.balance!=null ? `· R${a.balance}` : ''} {a.openedAt ? `· Opened ${new Date(a.openedAt).toLocaleDateString()}` : ''} {a.closedAt ? `· Closed ${new Date(a.closedAt).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-outline" onClick={()=>startEdit(a)}>Edit</button>
                      <button className="btn" onClick={()=>toggleClosed(a)}>
                        {a.isClosed ? 'Reopen' : 'Close'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
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