import React, { useCallback, useState } from 'react'

export default function DropImage({onFiles}:{onFiles:(files:File[])=>void}){
  const [hover,setHover]=useState(false)
  const onDrop = useCallback((e:React.DragEvent<HTMLDivElement>)=>{
    e.preventDefault(); setHover(false)
    const files = Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/'))
    if(files.length) onFiles(files)
  },[onFiles])
  return (
    <div
      onDragOver={(e)=>{e.preventDefault(); setHover(true)}}
      onDragLeave={()=>setHover(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-2xl p-6 text-center ${hover?'border-sky-600 bg-sky-50':'border-slate-300'}`}
    >
      <p className="mb-2 font-medium">Drag & drop screenshots here</p>
      <p className="text-sm text-slate-500">or use the buttons below</p>
    </div>
  )
}