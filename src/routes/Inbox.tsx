import React, { useRef, useState } from 'react'
import DropImage from '../components/DropImage'
import { ocrImage } from '../lib/ocr'
import { parseText } from '../lib/parse'
import { db, InboxItem, Transaction, BalanceCheckpoint, Account } from '../lib/db'
import { fmtMoney, todayISO } from '../lib/format'

export default function Inbox(){
  const [items,setItems]=useState<InboxItem[]>([])
  const [busy,setBusy]=useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [accounts,setAccounts] = React.useState<Account[]>([])

  React.useEffect(()=>{ db.accounts.toArray().then(setAccounts)},[])

  async function addText(){
    const text = await navigator.clipboard.readText()
    if(!text) { alert('Clipboard empty'); return }
    const parsed = parseText(text)
    const item: InboxItem = { createdAt: new Date().toISOString(), source:'text', rawText:text, ocrText:text, status:'new', parsed, confidence: 0.7 }
    setItems(s => [item, ...s])
  }

  async function onFiles(files: File[]){
    setBusy(true)
    try {
      for(const f of files){
        const text = await ocrImage(f)
        const parsed = parseText(text)
        const item: InboxItem = { createdAt: new Date().toISOString(), source:'image', ocrText:text, status:'new', parsed, confidence: 0.5 }
        setItems(s=>[item, ...s])
      }
    } finally {
      setBusy(false)
    }
  }

  async function accept(item: InboxItem, idx:number){
    // create transaction & optional balance checkpoint
    const p = item.parsed || {}
    const tx: Transaction = {
      date: p.date || todayISO(),
      amount: Math.abs(p.amount ?? 0) * (p.type==='expense' || p.type==='debt_payment' || p.type==='transfer' ? -1 : 1),
      type: p.type || 'expense',
      accountId: p.accountId,
      merchant: p.merchant,
      note: (item.source==='image'?'(OCR) ':'') + (item.rawText?.slice(0,120) || '')
    }
    await db.transactions.add(tx)
    if(p.balanceCheckpoint!=null && p.accountId){
      const bc: BalanceCheckpoint = { accountId: p.accountId, date: tx.date, balance: p.balanceCheckpoint }
      await db.balanceCheckpoints.add(bc)
    }
    setItems(s=>s.filter((_,i)=>i!==idx))
  }

  function updateParsed(idx:number, patch: any){
    setItems(s=> s.map((it,i)=> i===idx ? {...it, parsed: {...(it.parsed||{}), ...patch}} : it))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className="btn" onClick={addText}>Paste Text from Clipboard</button>
        <button className="btn-outline" onClick={()=>fileRef.current?.click()}>Pick Screenshots</button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e)=> onFiles(Array.from(e.target.files||[]))}/>
      </div>

      <DropImage onFiles={onFiles}/>

      {busy && <div className="text-slate-600">Running OCR…</div>}

      <div className="grid gap-3">
        {items.map((it,idx)=>{
          const p = it.parsed || {}
          return (
            <div key={idx} className="card">
              <div className="flex items-center justify-between">
                <div className="text-slate-500 text-sm">{new Date(it.createdAt).toLocaleString()}</div>
                <span className="text-xs rounded-full px-2 py-0.5 bg-slate-100">{it.source}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <label className="label">Type</label>
                  <select className="input" value={p.type||''} onChange={e=>updateParsed(idx,{type:e.target.value})}>
                    <option value="">Choose…</option>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                    <option value="debt_payment">Debt payment</option>
                  </select>

                  <label className="label mt-2">Amount</label>
                  <input className="input" type="number" value={p.amount||''} onChange={e=>updateParsed(idx,{amount: parseFloat(e.target.value)})}/>

                  <label className="label mt-2">Date</label>
                  <input className="input" type="date" value={p.date||''} onChange={e=>updateParsed(idx,{date:e.target.value})}/>

                  <label className="label mt-2">Merchant/Note</label>
                  <input className="input" value={p.merchant||''} onChange={e=>updateParsed(idx,{merchant:e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <label className="label">Account</label>
                  <select className="input" value={p.accountId||''} onChange={e=>updateParsed(idx,{accountId: Number(e.target.value)})}>
                    <option value="">Select…</option>
                    {accounts.map(a=> <option key={a.id} value={a.id}>{a.name} {a.last4?`••${a.last4}`:''}</option>)}
                  </select>

                  <label className="label mt-2">Balance checkpoint (optional)</label>
                  <input className="input" type="number" value={p.balanceCheckpoint||''} onChange={e=>updateParsed(idx,{balanceCheckpoint: parseFloat(e.target.value)})}/>

                  <div className="mt-4 text-sm text-slate-600">
                    <div>Confidence: {(it.confidence??0)*100|0}%</div>
                    <div>Detected: {p.type || '—'} · {p.amount!=null? fmtMoney(p.amount):'—'} · {p.date || '—'}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="btn" onClick={()=>accept(it, idx)}>Accept</button>
                <button className="btn-outline" onClick={()=> setItems(s=>s.filter((_,i)=>i!==idx))}>Discard</button>
              </div>
              {it.ocrText && <details className="mt-3">
                <summary className="cursor-pointer text-slate-600">Raw text</summary>
                <pre className="whitespace-pre-wrap text-xs mt-2 bg-slate-50 p-2 rounded">{it.ocrText}</pre>
              </details>}
            </div>
          )
        })}
      </div>
    </div>
  )
}