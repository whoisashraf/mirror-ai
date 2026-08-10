# Mirror AI MVP requirements traceability

This file maps the locked MVP requirements to the competition build. The product owner's original specification remains the product source of truth; this checklist records implementation status.

| Requirement area | Status | Implementation |
|---|---|---|
| Product thesis / B2B2C flow | Done | Storefront → try-on → Mirror chat → merchant recommendations → complete look → merchant link |
| Shopper actor | Done | Anonymous-first storefront and try-on flow |
| Merchant actor | Done | Auth shell, catalogue CRUD, overview, analytics, settings |
| Admin actor | Deferred | Admin UI explicitly optional for competition |
| Storefront route | Done | `/store/:slug` |
| Product detail | Done | `/store/:slug/product/:productId` |
| Photo upload / camera | Done | Image input with `capture`, preview, replace, delete |
| Explicit photo consent | Done | Consent required before upload |
| No forced shopper registration | Done | Supabase Anonymous Auth happens invisibly when backend mode is enabled |
| Try-on generation states | Done | Preparing / Generating / Finalizing / failure |
| Try-on result | Done | Result, regenerate, save-look marker, purchase click, disclaimer |
| Contextual chat | Done | Product, merchant catalogue, history, generation/session context |
| Catalogue-only recommendations | Done | Structured output + server-side product-ID allow-list validation |
| Complete-look generation | Done | Shopper + selected/recommended merchant product reference images |
| Merchant branding | Done | Core merchant fields/schema; simple fashion-first storefront |
| Dashboard overview | Done | Product count, try-ons, conversations, recommendation clicks, checkout intent |
| Product CRUD | Done | Add/edit/archive/delete; competition UI uses image URL input |
| Analytics funnel | Done | Event table + funnel UI |
| Event tracking | Done | Core golden-path events; unused optional events remain supported in whitelist |
| Supabase Auth | Done | Anonymous shopper + email/password merchant |
| Database model | Done | Migration includes requested entities plus security/cost fields |
| Supabase Storage | Done | Product/public assets and private shopper/result buckets |
| `generate-try-on` Edge Function | Done | Auth, image ownership, product ownership, rate limits, Gemini, result storage |
| `chat-with-mirror` Edge Function | Done | History/catalogue context, OpenRouter/Gemini, structured response validation |
| `track-event` Edge Function | Done | Authenticated first-party event capture |
| `merchant-analytics` Edge Function | Done | Owner-authorized aggregation |
| Gemini image understanding/generation | Done | Current native Gemini image Interactions endpoint |
| Prompting rules / no invented products | Done | System prompt + server-side ID validation |
| Claims restrictions | Done | UI/prompt language avoids fit/return/revenue guarantees |
| Privacy | Done for MVP | Private storage, consent, real source-photo deletion, signed URLs, privacy page |
| Payments | Deferred | Buy redirects to merchant URL, per requirement |
| Business model | Product-only | No billing over-engineering |
| Mobile-first UI | Done | Touch targets, imagery-led cards, responsive layout, no gradients |
| Routes | Done | Core shopper/dashboard/privacy/auth routes; admin omitted |
| Pinia state | Done | Shopper, try-on, chat; server-derived catalogue fetched independently |
| Component structure | Done | Store / try-on / chat / dashboard / UI grouping |
| PWA | Basic done | Manifest, icons, service worker; no heavy offline behavior |
| Tauri | Deferred | Deliberately not included until web flow is stable |
| Performance basics | Done | Lazy product images, bounded UI, no generation UI blocking, simple loading states |
| Failure states | Mostly done | Generation/API/offline/no-products/missing-session states; production observability later |
| Security / RLS | Done for MVP | RLS, Auth UID photo isolation, owner isolation, server-side secrets and validation |
| Rate/cost controls | Done | Shopper/IP/merchant generation caps and model/cost/token fields |
| Demo dataset | Done | Mirror Atelier, 16 products |
| Low-friction partner onboarding | Supported | Manual catalogue entry; no CRM/Shopify/API required |
| 90-second demo | Supported | Golden path is the default click-through |
| PWA/native scope discipline | Done | No Tauri/native detour |

## Known competition-safe simplifications

- Replace placeholder product images before demo recording.
- Product form uses image URLs instead of a polished upload/optimization workflow.
- Initial hosted demo merchant owner must be attached to a real Auth user once after seeding.
- AI generation is synchronous at Edge Function level while the client independently shows progress. Add a queue only after pilot volume requires it.
- No admin screen, billing, Shopify sync, social layer, wardrobe, size prediction or revenue attribution.

## v0.3 demo-readiness additions

- Persistent fitting-room viewport on mobile and desktop: current image remains visible while chat scrolls.
- Explicit current-look state with add/remove/replace semantics and category-aware replacement rules.
- Recommendation cards now expose **Add to look** and **View** actions rather than prose-only recommendations.
- Mirror replies may return validated structured UI actions: add, replace, remove, try complete look, or shop look.
- Chained generation history keeps up to 8 completed looks available for quick comparison.
- `Shop this look` lists every current merchant product, total value and tracked outbound product clicks.
- Basic upload preflight checks image resolution/framing and gives category-specific guidance before generation.
- Local demo mode includes a prepared full-body demo model and an explicitly labelled deterministic fallback preview.
- Demo operator control resets chat, photo, look history, session ID, saved looks and local analytics.
- Tenant switching clears tenant-scoped shopper state and rotates the guest shopper session ID.
- Merchant analytics now surfaces aggregated shopper question themes and top interaction products.
- Merchant white-label settings include a live storefront preview.
- Product form exposes the inferred try-on class and product-preservation preparation before save.
