import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const NavItem: React.FC<{to:string; label:string}> = ({to,label}) => (
  <NavLink to={to} className={({isActive}) =>
    `px-3 py-2 rounded-xl ${isActive ? 'bg-sky-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`
  }>{label}</NavLink>
)

export default function App(){
  return (
    <div>
      <header className="bg-white border-b">
        <div className="container flex items-center justify-between py-3">
          <div className="font-bold text-sky-700">Meet Vera: your AI finance assistant.</div>
          <nav className="flex gap-2 text-sm">
            <NavItem to="/" label="Overview" />
            <NavItem to="/inbox" label="Inbox" />
            <NavItem to="/transactions" label="Transactions" />
            <NavItem to="/accounts" label="Accounts" />
            <NavItem to="/debts" label="Debts" />
            <NavItem to="/goals" label="Goals" />
            <NavItem to="/plan" label="Plan" />
          </nav>
        </div>
      </header>
      <main className="container py-6">
        <Outlet/>
      </main>
    </div>
  )
}