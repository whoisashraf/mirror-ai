# Mirror AI MVP implementation notes

## Competition-critical path implemented

1. Merchant storefront and product discovery.
2. Authenticated shopper plus browser-scoped fitting session.
3. Consent + shopper photo upload.
4. Private Supabase storage path scoped to server-managed guest shopper session.
5. Server-side Gemini virtual try-on request.
6. Staged generation UX and retry/regenerate handling.
7. Contextual Mirror chat.
8. Merchant-catalogue-constrained structured recommendations.
9. Complete-look generation.
10. Merchant link/checkout-intent event.
11. Merchant funnel analytics.
12. Public, privacy-safe pilot evidence route backed by aggregate live metrics.

## Deliberate MVP cuts / simplifications

- No Tauri wrapper. PWA/web remains source application.
- No Shopify app or catalogue sync.
- No billing.
- No revenue attribution.
- No size prediction.
- No shopper social features or wardrobe.
- No advanced admin UI.
- No merchant theme builder.
- Product and merchant image uploads are direct, but automated resizing and image optimization remain future work.
- Catalogue CSV import is available; Shopify or other automatic catalogue sync remains out of scope.
- Image generation is synchronous inside the Edge Function. The browser shows progress while it waits. A real queue should replace this when usage grows.
- Demo mode intentionally reuses the uploaded photo as the result placeholder. It exists only so UI/product flow can be tested before API keys are configured.
- Seed catalogue images are placeholders and must be replaced with real clean product photography for the competition recording.

## Safety / claims

UI and AI prompts avoid guaranteeing fit, sizing, colour accuracy, material behaviour, return reduction or revenue lift. Try-on output is described as a visual approximation.

## Security decisions

- Shopper photos and try-on output buckets are private.
- Shopper JWT ownership and a separate hashed fitting-session token are both required for private photos, generations and conversations.
- Account changes rotate browser fitting credentials and clear cached private photo/look state; legacy unowned sessions cannot be claimed.
- Raw model/API secrets exist only in Edge Functions.
- Product recommendation IDs are validated server-side against active merchant products.
- Generation endpoint validates product ownership and shopper image ownership.
- Expensive generation is limited by shopper/session, IP and merchant buckets.
- Merchant analytics requires the authenticated user to own that merchant.
- The public pilot endpoint is fixed to the demo merchant and exposes aggregate
  counts only; it does not accept caller-selected merchant IDs or return shopper data.
- Removing a shopper's base photo also removes generated result objects linked to
  that source image.
