import Dexie, { Table } from 'dexie'

export interface Account { id?: number; name: string; type: 'cheque'|'savings'|'cash'|'credit'|'loan'|'bond'; last4?: string; balance?: number;   isClosed?: boolean; openedAt?: string; closedAt?: string; }
export interface Debt { id?: number; name: string; balance: number; apr: number; minPayment: number; dueDay?: number; notes?: string; accountId?: number }
export interface Category { id?: number; name: string; group?: string }
export interface Goal { id?: number; name: string; target: number; saved: number }
export type TxType = 'expense'|'income'|'transfer'|'debt_payment'
export interface Transaction { id?: number; date: string; amount: number; type: TxType; accountId?: number; debtId?: number; goalId?: number; categoryId?: number; merchant?: string; note?: string }
export interface BalanceCheckpoint { id?: number; accountId: number; date: string; balance: number }
export interface InboxItem { id?: number; createdAt: string; source: 'text'|'image'; rawText?: string; imageBlob?: Blob; ocrText?: string; status: 'new'|'reviewed'|'saved'; confidence?: number; parsed?: ParsedDraft }
export interface ParsedDraft { amount?: number; date?: string; merchant?: string; type?: TxType; accountId?: number; categoryId?: number; balanceCheckpoint?: number; bank?: string }
// NEW types (db.ts)
export interface ReviewEntry {
  id?: number
  weekStart: string   // ISO Monday (or user setting)
  createdAt: string
  title: string       // e.g., "Weekly Review · 2025-09-22 → 2025-09-28"
  summary: string     // assistant paragraph
  metrics: {
    totalContrib: number
    goalsHit: number
    newClues: number
    biggestWinGoalId?: number
  }
}

export interface AppSettings {
  id?: number
  reminderCadence: 'off'|'weekly'|'daily'   // keep 'daily' for future
  reviewDay: number     // 0=Sun..6=Sat
  reviewHour: number    // 0-23
  lastReviewAt?: string
  quietHours?: { start: string, end: string } // "21:00", "07:00"
}

// NEW: Financial goal
export type GoalCategory = 'Savings' | 'Debt' | 'Investment'

export interface Goal {
  id?: number
  name: string
  target: number         // ZAR target to reach (or debt to clear)
  current: number        // current saved/paid amount (we'll keep it simple at first)
  category: GoalCategory
  deadline?: string      // ISO date (optional)
  color?: string         // optional UI color
  createdAt: string
  updatedAt: string
}

// NEW: Goal clues (milestone nudges)
export interface GoalClue {
  id?: number
  goalId: number
  text: string
  unlockAtPct: number    // e.g., 10, 25, 50, 75, 100
  notify: boolean
  unlockedAt?: string    // when it unlocked (set by logic)
}

// NEW: weekly snapshot of goal progress (to detect "crossed a milestone this week")
export interface GoalSnapshot {
  id?: number
  goalId: number
  weekStart: string      // ISO YYYY-MM-DD (same anchor as reviews.weekStart)
  pct: number            // progress percentage at snapshot time (0..100)
  current: number        // current amount at snapshot time
  createdAt: string
}

// Add this interface near the others
export interface LogEntry {
  id?: number
  ts: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  meta?: any
}


class AppDB extends Dexie {
  accounts!: Table<Account, number>
  debts!: Table<Debt, number>
  categories!: Table<Category, number>
  goals!: Table<Goal, number>
  transactions!: Table<Transaction, number>
  balanceCheckpoints!: Table<BalanceCheckpoint, number>
  inbox!: Table<InboxItem, number>
  reviews!: Table<ReviewEntry, number>   // NEW
  settings!: Table<AppSettings, number>  // NEW
  logs!: Table<LogEntry, number>

  constructor(){
    super('budget-db')
    this.version(1).stores({
      accounts: '++id, name, type, last4',
      debts: '++id, name, apr, accountId',
      categories: '++id, name',
      goals: '++id, name',
      transactions: '++id, date, type, accountId, debtId, categoryId',
      balanceCheckpoints: '++id, accountId, date',
      inbox: '++id, createdAt, status'
    })
    this.version(2).stores({
      reviews: '++id, weekStart',  // index by weekStart for quick lookup
      settings: 'id'               // single-row table (id=1)
    })
    // NEW: goals, clues, and progress snapshots
    this.version(3).stores({
      goals: '++id, name, category',
      goalClues: '++id, goalId, unlockAtPct',
      goalSnapshots: '++id, goalId, weekStart'
    })
  
  this.version(4).stores({
  logs: '++id, ts, level'
})
  }
}

export const db = new AppDB()

// NEW: ensure there is a default settings row (weekly, Sun 19:00)
export async function ensureDefaultSettings() {
  const existing = await db.settings.get(1)
  if (!existing) {
    await db.settings.put({
      id: 1,
      reminderCadence: 'weekly',
      reviewDay: 0,            // 0 = Sunday
      reviewHour: 19,          // 19:00
      quietHours: { start: '21:00', end: '07:00' },
      lastReviewAt: undefined,
    })
  }
}


// Seed defaults once
export async function seed(){
  const count = await db.accounts.count()
  if(count>0) return
  const [nedChequeId, fnbCCId] = await db.accounts.bulkAdd([
    { name: 'Nedbank Cheque', type: 'cheque', last4: '1234', balance: 0 },
    { name: 'FNB Credit Card', type: 'credit', last4: '5678', balance: -12000 },
  ], { allKeys: true }) as number[]

  await db.debts.add({ name: 'FNB Credit Card', balance: 12000, apr: 20.5, minPayment: 600, accountId: fnbCCId })
  await db.categories.bulkAdd([
    { name:'Rent', group:'Essentials' },
    { name:'Groceries', group:'Essentials' },
    { name:'Transport', group:'Essentials' },
    { name:'Utilities', group:'Essentials' },
    { name:'Medical', group:'Essentials' },
    { name:'Data/Airtime', group:'Essentials' },
    { name:'Entertainment', group:'Lifestyle' },
    { name:'Debt Repayments', group:'Financial' },
    { name:'Savings/Goals', group:'Financial' }
  ])
}