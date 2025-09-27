export type CsvRow = Record<string, string|number|undefined|null>

export function toCSV(rows: CsvRow[], headers?: string[]) {
  if(!rows.length) return ''
  const keys = headers && headers.length ? headers : Object.keys(rows[0])
  const esc = (v:any) => {
    const s = v==null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s
  }
  return [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n')
}

export function downloadCSV(filename: string, csvText: string){
  const blob = new Blob([csvText], {type:'text/csv;charset=utf-8;'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}
