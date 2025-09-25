import Dexie, { Table } from 'dexie'

export interface Account { id?: number; name: string; type: 'cheque'|'savings'|'cash'|'credit'|'loan'|'bond'; last4?: string; balance?: number }
export interface Debt { id?: number; name: string; balance: number; apr: number; minPayment: number; dueDay?: number; notes?: string; accountId?: number }
export interface Category { id?: number; name: string; group?: string }
export interface Goal { id?: number; name: string; target: number; saved: number }
export type TxType = 'expense'|'income'|'transfer'|'debt_payment'
export interface Transaction { id?: number; date: string; amount: number; type: TxType; accountId?: number; debtId?: number; goalId?: number; categoryId?: number; merchant?: string; note?: string }
export interface BalanceCheckpoint { id?: number; accountId: number; date: string; balance: number }
export interface InboxItem { id?: number; createdAt: string; source: 'text'|'image'; rawText?: string; imageBlob?: Blob; ocrText?: string; status: 'new'|'reviewed'|'saved'; confidence?: number; parsed?: ParsedDraft }
export interface ParsedDraft { amount?: number; date?: string; merchant?: string; type?: TxType; accountId?: number; categoryId?: number; balanceCheckpoint?: number; bank?: string }

class AppDB extends Dexie {
  accounts!: Table<Account, number>
  debts!: Table<Debt, number>
  categories!: Table<Category, number>
  goals!: Table<Goal, number>
  transactions!: Table<Transaction, number>
  balanceCheckpoints!: Table<BalanceCheckpoint, number>
  inbox!: Table<InboxItem, number>

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
  }
}

export const db = new AppDB()

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