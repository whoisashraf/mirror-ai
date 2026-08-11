# Mirror AI MVP v0.4

Mirror AI is a mobile-first white-label fashion try-on and styling assistant for merchant storefronts.

This build uses the hosted Supabase and OpenRouter services and includes:

- merchant-isolated storefronts / white-label theming
- persistent fitting-room layout
- current-look add / remove / replace actions
- shopper photo upload + try-on generation
- conversational stylist chat with structured product actions
- vision-grounded styling recommendations based on the current generated look
- chained generations for complete looks
- shoes / accessories fidelity handling
- outfit-logic QA that rejects duplicated, floating or hand-held garments
- merchant analytics funnel
- **authenticated shoppers with private browser-scoped fitting sessions**
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

> Shoppers use normal email/password Supabase Auth before uploading a photo or
> starting a try-on. A separate server-managed fitting-session token keeps each
> browser's private try-on resources scoped and is stored in local storage.

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

Use normal Supabase Auth. Dashboard routes validate the current user before
navigation, redirect signed-out users back to `/auth`, and preserve the intended
dashboard URL after sign-in. Supabase RLS remains the authorization boundary for
merchant records. Sessions persist and refresh through `supabase-js`; signing out
clears the local Supabase session.

Application roles are derived from protected database ownership:

- `admin`: the authenticated user owns a row in `merchants`
- `user`: an authenticated shopper without merchant ownership

The storefront navbar shows the active account and role. Only admins can enter
dashboard routes. Role decisions never use editable `user_metadata`.

### Shoppers

Sign in with normal Supabase email/password Auth before uploading a photo,
generating a look, deleting a photo, or chatting with Mirror.

After authentication, the app also generates a browser-local fitting session:

- `session_id`
- `session_token`

All shopper-sensitive operations require both the Supabase user JWT and fitting-session token:

- `upload-shopper-image`
- `delete-shopper-image`
- `generate-try-on`
- `chat-with-mirror`

The token is hashed server-side in `shopper_sessions`.

Completed looks can be saved in the current browser. Saves are validated,
deduplicated by generation, and capped at 20 entries. Private photo access still
uses short-lived signed URLs; browser saves do not weaken Storage policies.

---

## Edge Functions

### Shopper functions

These require a Supabase user JWT plus the custom fitting-session token and must
keep JWT verification enabled:

- `upload-shopper-image`
- `delete-shopper-image`
- `generate-try-on`
- `chat-with-mirror`

Example:

```bash
supabase functions deploy upload-shopper-image
supabase functions deploy delete-shopper-image
supabase functions deploy generate-try-on
supabase functions deploy chat-with-mirror
```

`track-event` also keeps gateway JWT verification enabled, but accepts the
frontend publishable token so public storefront views can still be counted.

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
