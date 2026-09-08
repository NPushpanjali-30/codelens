# CodeLens — AI-Powered Codebase Intelligence & Developer Onboarding Platform

Full-stack Next.js 14 (App Router) + TypeScript + Tailwind + Supabase + GitHub + Grok application.

## What's included
- **Frontend**: landing page, auth (login/signup via Supabase), full dashboard shell
  (Overview, Repositories, Architecture, Files, APIs, Database, Dependencies, AI Chat,
  Analysis, Settings), file explorer with syntax-highlighted code viewer, chat UI with
  per-message source citations.
- **Backend**: Supabase schema + Row Level Security (`supabase/schema.sql`), GitHub OAuth
  + repo listing/scanning (`lib/github/*`), the JS/TS repository analyzer (`lib/analyzer/*`
  — language detection, dependency parsing, API-route detection, code chunking), the Grok
  AI service (`lib/ai/grok.ts`), keyword-based RAG retrieval (`lib/retrieval/search.ts`),
  and every API route the frontend calls (`app/api/**`).
- **Security**: secret redaction and ignore-list filtering before anything reaches Grok
  (`lib/security/filters.ts`), Zod input validation on every route, RLS on every table,
  service-role key used only in server-only modules, GitHub/Grok tokens never sent to the
  browser.

## Setup

### 1. Install
```bash
npm install
cp .env.example .env.local
```

### 2. Supabase
1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/schema.sql` in full.
3. Copy **Project URL**, **anon public key**, and **service_role key** into `.env.local`
   as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4. In Authentication → Providers, enable Email (for signup/login) and, optionally, GitHub
   (Supabase's own "Sign in with GitHub" button on the login page — separate from the repo
   -access OAuth App below).

### 3. GitHub OAuth App (for reading repository contents)
1. Go to github.com/settings/developers → New OAuth App.
2. Homepage URL: `http://localhost:3000`. Callback URL: `http://localhost:3000/api/github/callback`.
3. Copy the Client ID and generate a Client Secret into `.env.local` as `GITHUB_CLIENT_ID` /
   `GITHUB_CLIENT_SECRET`.
4. Update both URLs to your production domain when you deploy.

### 4. Grok API
1. Get an API key from x.ai.
2. Set `GROK_API_KEY` in `.env.local`. `GROK_API_BASE_URL` defaults to `https://api.x.ai/v1`.

### 5. Run
```bash
npm run dev
```
Visit `http://localhost:3000`, sign up, connect GitHub from the Repositories tab, pick a
repo, click Analyze, then use AI Chat once analysis completes.

## Project structure
```
app/                    Next.js App Router: pages + API routes
  api/                  Route handlers (github, analyze, repositories, files, chat, auth)
  dashboard/            Protected dashboard pages
components/             UI primitives + feature components
lib/
  supabase/             Browser/server/admin Supabase clients
  github/                GitHub OAuth + REST client
  analyzer/              Scanner, language/dependency/API-route detection, chunker
  ai/                    Grok client + AI context builder
  retrieval/             RAG (Postgres full-text search over code_chunks)
  security/              File filters, secret redaction, Zod validation
  auth/                  requireUser() helper for route handlers
supabase/schema.sql      Full DB schema + RLS policies + auto-profile trigger
types/                   Shared TypeScript types
middleware.ts            Protects /dashboard routes
```

## Known gaps (flagged, not faked)
- **Tests** (spec section 30) are not yet included.
- **Chat history UI**: past `chat_sessions` aren't loaded back into the Chat page yet
  (messages persist to the DB via `/api/chat`, but the sidebar/session switcher UI is
  pending).
- **Vector search**: `code_chunks.embedding` (pgvector) exists in the schema but retrieval
  currently uses Postgres full-text search, per the spec's "keyword-based first" guidance.
