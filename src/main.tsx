import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles/index.css'
import App from './App'
import Overview from './routes/Overview'
import Inbox from './routes/Inbox'
import Transactions from './routes/Transactions'
import Accounts from './routes/Accounts'
import Debts from './routes/Debts'
import Goals from './routes/Goals'
import Plan from './routes/Plan'
import { registerSW } from './lib/pwa'

registerSW();
// BEFORE:
// import('./lib/db').then(m => m.seed().then(() => m.ensureDefaultSettings()))

// AFTER: seed → ensure defaults → maybe run weekly review
import('./lib/db')
  .then(m => m.seed().then(() => m.ensureDefaultSettings()))
  .then(() => import('./lib/reviews'))
  .then(r => r.maybeRunWeeklyReview())
  .catch(() => {})



const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'inbox', element: <Inbox /> },
      { path: 'transactions', element: <Transactions /> },
      { path: 'accounts', element: <Accounts /> },
      { path: 'debts', element: <Debts /> },
      { path: 'goals', element: <Goals /> },
      { path: 'plan', element: <Plan /> },
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)