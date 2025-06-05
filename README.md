# i4ops Baremetal & VM Management Dashboard

This repo contains two main parts:
1. `server/` ‒ A Node.js + Express backend using Prisma + PostgreSQL for storing hosts and VMs.
2. `dashboard/` ‒ A React + Vite + TypeScript frontend (with Supabase authentication) that visualizes hosts & VMs.

---

## Prerequisites

- Node.js v16+ / npm
- PostgreSQL (locally running, with a database `i4ops_dashboard`)
- Supabase project credentials (for auth)

---

### 1. Backend Setup

```bash
cd server
npm install

# 1) Configure your DB connection in server/.env (DATABASE_URL)
#    For example:
#    DATABASE_URL="postgresql://youruser:yourpassword@localhost:5432/i4ops_dashboard"

# 2) Run migrations & seed sample data:
npm run prisma:migrate   # runs `prisma migrate dev`
npm run prisma:seed      # runs `prisma/seed.ts`

# 3) Start the dev server:
npm run dev
# → Express will run on http://localhost:4000
