# PhotoSaaS — Multi-Tenant Event Photo Platform

## Step 1: Multi-Tenant Authentication ✅

This is the foundation of the platform. Every feature you build next (events, photo upload, face recognition) depends on this auth layer being correct.

---

## Architecture

```
Next.js 14 (App Router)
    │
    ├── /signup       → Creates tenant + owner in one transaction
    ├── /login        → Authenticates user within a specific tenant
    ├── /dashboard    → Protected, server-rendered, scoped to tenant
    │
    └── API Routes
        ├── POST /api/auth/signup
        ├── POST /api/auth/login
        ├── POST /api/auth/logout
        └── GET  /api/auth/me

Prisma ORM → Supabase PostgreSQL
JWT in httpOnly cookie (7 days)
Middleware protects /dashboard routes
```

---

## Quick Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd photosaas
npm install
```

### 2. Create your Supabase database

1. Go to [supabase.com](https://supabase.com) → New project
2. Wait for it to provision
3. Go to **Settings → Database → Connection string → URI**
4. Copy the connection string

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-REF].supabase.co:5432/postgres"
JWT_SECRET="run: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
```

### 4. Set up the database

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to Supabase
npm run db:seed       # Create demo tenant + user
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Test the flow

1. Visit `/signup` → Create a new organization
2. Note your **workspace ID** (e.g. `johns-photography`)
3. Visit `/login` → Enter workspace ID + email + password
4. You're in the dashboard!

Or use the seeded demo credentials:
- Org ID: `demo-photography`
- Email: `owner@demo.com`
- Password: `demo1234`

---

## Multi-tenancy explained

Every record in the database has a `tenantId`. When John from "Johns Photography" logs in:

```sql
-- His JWT contains: { userId, tenantId: "abc123", ... }

-- Every query is scoped:
SELECT * FROM events WHERE tenant_id = 'abc123';
SELECT * FROM members WHERE tenant_id = 'abc123';
```

He **cannot** see ABC School's data. Ever.

---

## File structure

```
src/
├── app/
│   ├── api/auth/
│   │   ├── signup/route.ts    ← Creates tenant + owner
│   │   ├── login/route.ts     ← Auth within tenant
│   │   ├── logout/route.ts    ← Clears cookie
│   │   └── me/route.ts        ← Current user
│   ├── signup/
│   │   ├── page.tsx           ← 2-step signup UI
│   │   └── signup.module.css
│   ├── login/
│   │   ├── page.tsx           ← Login UI
│   │   └── login.module.css
│   ├── dashboard/
│   │   ├── page.tsx           ← Server component
│   │   ├── DashboardClient.tsx ← Client component with logout
│   │   └── dashboard.module.css
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── prisma.ts              ← DB client singleton
│   ├── auth.ts                ← JWT, bcrypt, cookie helpers
│   └── validations.ts         ← Zod schemas
├── middleware.ts               ← Route protection
prisma/
├── schema.prisma              ← DB schema
└── seed.ts                    ← Demo data
```

---

## What's next (Step 2)

Once you've confirmed auth works, we'll build:

- Event creation (name, date, description, cover photo)
- Member invitation (email, QR code)
- Role-based permissions (owner vs staff vs viewer)
- Team member management (invite staff to your workspace)

---

## Deployment (Vercel)

```bash
# Push to GitHub, then:
# 1. Connect repo to Vercel
# 2. Add environment variables in Vercel dashboard
# 3. Deploy

vercel --prod
```

Done. Your multi-tenant auth is live.
