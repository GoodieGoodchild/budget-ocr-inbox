import React from 'react'
import { db, LogEntry } from '../lib/db'

export default function Logs() {
  const [rows, setRows] = React.useState<LogEntry[]>([])

  React.useEffect(() => {
    db.logs.orderBy('ts').reverse().limit(500).toArray().then(setRows)
  }, [])

  return (
    <div className="card">
      <h3 className="font-semibold mb-2">Logs</h3>
      <table className="w-full text-sm">
        <thead><tr><th>Time</th><th>Level</th><th>Message</th><th>Meta</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{new Date(r.ts).toLocaleString()}</td>
              <td>{r.level}</td>
              <td>{r.message}</td>
              <td><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(r.meta,null,2)}</pre></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
