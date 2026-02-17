# ElectroBill — GST Billing Software

A desktop billing and inventory management system built for Indian small businesses.
Built with Electron + React + TypeScript + SQLite.

---

## Features

- **GST-compliant invoicing** — Tax invoices, proforma, credit/debit notes
- **CGST / SGST / IGST** — Auto-determined from seller/buyer GSTIN state codes
- **E-Invoice ready** — NIC e-Invoice JSON format generation
- **Inventory management** — Stock tracking with full ledger history
- **Purchase management** — Supplier and purchase entry tracking
- **Multi-user RBAC** — 5 roles: Super Admin, Admin, Billing Staff, Purchase Staff, Auditor
- **Audit log** — Immutable log of every action with user, timestamp, and old/new values
- **Backup & restore** — Encrypted JSON backup with SHA-256 checksum verification
- **HSN summary** — Invoice-level HSN grouping for GST filing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron |
| Frontend | React + TypeScript + Vite |
| UI components | shadcn/ui + Tailwind CSS |
| Database | SQLite (better-sqlite3) via Electron IPC |
| Testing | Vitest — 241 tests across 8 suites |
| Password hashing | bcryptjs (cost factor 12) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm (do not use bun — see lockfile note below)

### Install dependencies
```bash
npm install
```

### Run in development (browser preview)
```bash
npm run dev
```

### Run as Electron desktop app
```bash
npm run electron:dev
```

### Build distributable (.exe / .dmg)
```bash
npm run electron:build
```

---

## Default Login

On first run, a default admin account is created automatically:

| Username | Password |
|---|---|
| admin | admin123 |

**You will be forced to change this password on first login.**
The default password cannot be used after the first login.

---

## Running Tests

```bash
npx vitest run
```

For detailed per-test output:
```bash
npx vitest run --reporter=verbose
```

---

## Project Structure

```
billingms/
├── electron/
│   ├── main.cjs          # Electron main process + all IPC handlers
│   ├── preload.cjs       # Secure contextBridge API exposed to renderer
│   └── backend/
│       └── db.cjs        # SQLite database init, schema, backup
├── src/
│   ├── lib/
│   │   ├── gst-calculations.ts   # GST engine (CGST/SGST/IGST, rounding, HSN)
│   │   ├── rbac.ts               # Role-based access control
│   │   ├── audit.ts              # Audit log writer
│   │   ├── backup.ts             # Backup/restore logic
│   │   ├── einvoice.ts           # NIC e-Invoice JSON generator
│   │   └── validation.ts         # Zod schemas + input sanitization
│   ├── pages/
│   │   ├── Index.tsx             # Login + forced password change
│   │   ├── Dashboard.tsx
│   │   ├── Billing.tsx
│   │   ├── Inventory.tsx
│   │   ├── Customers.tsx
│   │   ├── Purchases.tsx
│   │   ├── Reports.tsx
│   │   ├── Backup.tsx
│   │   └── Settings.tsx
│   ├── types/
│   │   └── index.ts              # All TypeScript interfaces
│   └── test/
│       ├── gst-calculations.test.ts
│       ├── rbac.test.ts
│       ├── invoice.test.ts
│       ├── backup.test.ts
│       ├── certification.test.ts
│       ├── stock-ledger.test.ts
│       └── validation.test.ts
└── docs/
```

---

## Security

- `contextIsolation: true`, `nodeIntegration: false` — renderer has no Node.js access
- All IPC handlers verify session tokens before executing
- Passwords hashed with bcryptjs (cost 12) — never stored in plaintext
- DevTools disabled in production builds
- F12 / Ctrl+Shift+I keyboard shortcuts blocked in production
- Soft deletes only — no financial data is ever hard-deleted

---

## Package Manager

This project uses **npm**. Do not use `bun install` — the `bun.lockb` file is a leftover
from initial scaffolding and has been superseded by `package-lock.json`.

---

## License

Private — not for redistribution.
