# Mirror AI MVP v0.4

Mirror AI is a mobile-first white-label fashion try-on and styling assistant for merchant storefronts.

This build uses the hosted Supabase and OpenRouter services and includes:

- merchant-isolated storefronts / white-label theming
- persistent fitting-room layout
- current-look add / remove / replace actions
- shopper photo upload + try-on generation
- conversational stylist chat with structured product actions
- chained generations for complete looks
- shoes / accessories fidelity handling
- merchant analytics funnel
- **guest shopper sessions (no Supabase anonymous sign-ins)**
- **OpenRouter-only AI backend**

---

## Tech stack

- **Frontend:** Vue 3 + Vite + TypeScript + Tailwind
- **Backend:** Supabase (Postgres, Storage, Edge Functions, Auth for merchants only)
- **AI provider:** OpenRouter

---

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Frontend env

Copy `.env.example` to `.env` and set:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable or anon-compatible key>
```

> Shopper sessions are **not** implemented with Supabase anonymous auth.
> Shoppers use server-managed guest session tokens stored in browser local storage.
> Supabase Auth is used only for merchants/admins.

### 3. Start Supabase locally

```bash
supabase start
supabase db reset
```

This applies all migrations and seeds the demo merchant/catalogue.

### 4. Function secrets

Create local function env from `supabase/functions/.env.example`.

Required:

```env
OPENROUTER_API_KEY=...
OPENROUTER_CHAT_MODEL=google/gemini-2.5-flash
OPENROUTER_QA_MODEL=google/gemini-2.5-flash
OPENROUTER_IMAGE_MODEL=google/gemini-3.1-flash-image
OPENROUTER_PRECISION_IMAGE_MODEL=google/gemini-3-pro-image
SITE_URL=http://localhost:5173
```

Then run:

```bash
supabase functions serve --env-file supabase/functions/.env.example
```

### 5. Start frontend

```bash
npm run dev
```

---

## Important auth / session model

### Merchants

Use normal Supabase Auth.

### Shoppers

Do **not** sign in.

The app generates a browser-local guest session:

- `session_id`
- `session_token`

All shopper-sensitive operations go through Edge Functions with the guest session token:

- `upload-shopper-image`
- `delete-shopper-image`
- `generate-try-on`
- `chat-with-mirror`
- `track-event`

The token is hashed server-side in `shopper_sessions`.

---

## Edge Functions

### Shopper functions

These use **custom guest-session auth** and should be deployed with JWT verification disabled:

- `upload-shopper-image`
- `delete-shopper-image`
- `generate-try-on`
- `chat-with-mirror`
- `track-event`

Example:

```bash
supabase functions deploy upload-shopper-image --no-verify-jwt
supabase functions deploy delete-shopper-image --no-verify-jwt
supabase functions deploy generate-try-on --no-verify-jwt
supabase functions deploy chat-with-mirror --no-verify-jwt
supabase functions deploy track-event --no-verify-jwt
```

### Merchant function

This should keep JWT verification enabled:

- `merchant-analytics`

```bash
supabase functions deploy merchant-analytics
```

---

## Seeded demo data

The repo seeds one demo merchant:

- **Mirror Atelier**

And ~16 demo products across:

- blazers
- tops
- bottoms
- dresses
- shoes
- accessories

---

## Key routes

Hosted style:

```text
/store/:slug
/store/:slug/product/:productId
/try-on/:generationId
```

White-label / custom domain style:

```text
/
/product/:productId
/try-on/:generationId
```

Dashboard:

```text
/dashboard
/dashboard/products
/dashboard/analytics
/dashboard/settings
```

---

## Supabase notes

This repo now expects:

- `enable_anonymous_sign_ins = false`
- private shopper images/results accessed through signed URLs issued by Edge Functions
- RLS for merchant-facing tables
- shopper-sensitive writes performed with service role inside functions

---

## Recommended first local run

1. `supabase start`
2. `supabase db reset`
3. add OpenRouter secret env
4. serve functions
5. `npm install`
6. create `.env`
7. `npm run dev`
8. open a demo storefront
9. upload a shopper photo
10. generate look → chat → add recommended products → shop look

---

## Frontend production env

For hosted environments:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Do **not** put `OPENROUTER_API_KEY` in the Vue app.
That secret belongs only in Supabase Edge Function secrets.
