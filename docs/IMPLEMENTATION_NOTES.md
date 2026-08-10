# Mirror AI MVP implementation notes

## Competition-critical path implemented

1. Merchant storefront and product discovery.
2. Anonymous shopper session.
3. Consent + shopper photo upload.
4. Private Supabase storage path scoped to server-managed guest shopper session.
5. Server-side Gemini virtual try-on request.
6. Staged generation UX and retry/regenerate handling.
7. Contextual Mirror chat.
8. Merchant-catalogue-constrained structured recommendations.
9. Complete-look generation.
10. Merchant link/checkout-intent event.
11. Merchant funnel analytics.

## Deliberate MVP cuts / simplifications

- No Tauri wrapper. PWA/web remains source application.
- No Shopify app or catalogue sync.
- No billing.
- No revenue attribution.
- No size prediction.
- No shopper social features or wardrobe.
- No advanced admin UI.
- No merchant theme builder.
- Dashboard product creation currently accepts a product image URL rather than uploading/optimizing the merchant image in the form.
- Image generation is synchronous inside the Edge Function. The browser shows progress while it waits. A real queue should replace this when usage grows.
- Demo mode intentionally reuses the uploaded photo as the result placeholder. It exists only so UI/product flow can be tested before API keys are configured.
- Seed catalogue images are placeholders and must be replaced with real clean product photography for the competition recording.

## Safety / claims

UI and AI prompts avoid guaranteeing fit, sizing, colour accuracy, material behaviour, return reduction or revenue lift. Try-on output is described as a visual approximation.

## Security decisions

- Shopper photos and try-on output buckets are private.
- Shoppers use Supabase Anonymous Auth, giving RLS an `auth.uid()` without asking the shopper to register.
- Raw model/API secrets exist only in Edge Functions.
- Product recommendation IDs are validated server-side against active merchant products.
- Generation endpoint validates product ownership and shopper image ownership.
- Expensive generation is limited by shopper/session, IP and merchant buckets.
- Merchant analytics requires the authenticated user to own that merchant.
