# HesabSənəd — AI-powered Accounting Document Processing SaaS

A production-grade B2B SaaS platform for accounting firms in Azerbaijan to automate invoice and receipt data entry.

## Tech Stack

- **Framework**: Next.js 14+ (App Router), TypeScript
- **Database & Auth**: Supabase (Postgres, Auth, Storage)
- **AI**: Google Gemini API (gemini-2.0-flash-exp)
- **Styling**: Tailwind CSS + shadcn/ui
- **Excel Export**: exceljs

## Features

- 📄 Drag-and-drop document upload (JPG, PNG, PDF)
- 🤖 AI-powered data extraction (date, amount, vendor, VÖEN/tax ID)
- ✏️ Editable review table for extracted fields
- 📊 Excel export in standard accounting format
- 🔒 Secure multi-tenant architecture with RLS
- 💳 Subscription billing (stubbed, ready for payment provider integration)
- 📱 Responsive, premium SaaS UI

## Prerequisites

- Node.js 18+
- A Supabase project
- A Google Gemini API key

## Setup

1. **Clone and install dependencies**

```bash
git clone <repo-url>
cd accounting-saas
npm install
```

2. **Create `.env.local`**

Copy `.env.example` to `.env.local` and fill in all required values:

```bash
cp .env.example .env.local
```

3. **Set up Supabase**

Run the SQL migration to create tables and RLS policies:

```bash
# Open Supabase SQL Editor and run:
supabase/migrations/001_initial_schema.sql
```

4. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for all required variables:

- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Gemini API**: `GEMINI_API_KEY`
- **App URL**: `NEXT_PUBLIC_APP_URL` (used for auth redirects and billing callbacks)

## Deployment

This project is optimized for **Vercel**:

1. Push to GitHub
2. Import into Vercel
3. Add environment variables from `.env.example`
4. Deploy

## Project Structure

```
app/
  (auth)/               # Auth pages (login, signup, profile setup)
  (dashboard)/          # Protected dashboard pages
  api/                  # API routes (documents, extract, export, billing)
  page.tsx              # Landing page
components/
  ui/                   # shadcn/ui primitives
  dashboard/            # Dashboard-specific components
  document/             # Document review components
  settings/             # Settings/billing components
lib/
  ai/                   # AI provider interface + Gemini implementation
  supabase/             # Supabase client setup (browser, server, admin)
  excel/                # Excel export logic
  validation/           # Zod schemas
  rate-limit.ts         # In-memory rate limiter
  utils.ts              # Utilities
supabase/
  migrations/           # SQL schema + RLS policies
```

## Security

- ✅ Supabase Row Level Security (RLS) on all tables
- ✅ Server-side validation on every API route
- ✅ File upload validation (type, size, sanitized names)
- ✅ Signed URLs for private file access
- ✅ Rate limiting on AI extraction endpoint
- ✅ Environment secrets never exposed client-side

## Payment Provider Integration

The billing checkout flow is stubbed in `app/api/billing/checkout/route.ts`. To integrate a real payment provider (Payriff, EPoint, Stripe):

1. Replace `createCheckoutSession` with the provider's SDK call
2. Add webhook handler to update subscription status
3. Add provider credentials to `.env.local`

## License

Proprietary — all rights reserved.
