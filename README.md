# Budget OCR Inbox (MVP)

Web-first budgeting tool with a fast **Inbox** that ingests **bank notifications or screenshots** using **on-device OCR** (Tesseract.js), parses amounts/dates, and saves **Transactions** to local storage (Dexie/IndexedDB). Installable as a **PWA** so it feels app-like on iPhone.

## Quick start
```bash
npm install
npm run dev
```
Open http://localhost:5173

## Features (MVP)
- Inbox: Paste text from clipboard, pick or drop screenshots → OCR → parse → review → save
- Local-first data (Dexie / IndexedDB), no server or cloud
- Basic screens: Overview, Transactions, Accounts, Debts
- PWA: Add to Home Screen on iPhone

## iPhone (PWA)
- Open the site in Safari → Share → Add to Home Screen. Launch from icon for a fullscreen app feel.

## Notes
- First run seeds a Nedbank Cheque and FNB Credit Card for testing (edit in Accounts).
- Parsing is rule-based; see `src/lib/parse.ts` to adjust regexes for your exact SMS/email text.
- OCR accuracy depends on screenshot clarity. Prefer crisp, non-blurry images.

## Roadmap
- Merchant/category auto-tagging UI & rules
- Debt snowball/avalanche projections
- Budget planner with categories and planned/actual
- CSV import/export
- Balance reconciliation with checkpoints