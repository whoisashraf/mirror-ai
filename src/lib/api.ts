import { demoMerchant, demoProducts } from '@/demo/catalogue'
import { getShopperSession } from '@/lib/session'
import { demoMode, supabase, supabasePublishableKey, supabaseUrl } from '@/lib/supabase'
import type { AnalyticsSummary, Merchant, MirrorReply, Product, TryOnGeneration } from '@/types'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, (char) => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[char] || char))

function buildDemoLookImage(shopperUrl: string | undefined, productIds: string[]) {
  const products = demoProducts.filter((product) => productIds.includes(product.id))
  const rows = products.slice(0, 6).map((product, index) => `<g transform="translate(0 ${index * 58})"><rect width="520" height="46" rx="23" fill="white" fill-opacity=".94"/><text x="22" y="29" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#111">${escapeXml(product.name)}</text></g>`).join('')
  const source = shopperUrl ? `<image href="${escapeXml(shopperUrl)}" x="0" y="0" width="900" height="1400" preserveAspectRatio="xMidYMid meet"/>` : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1400" viewBox="0 0 900 1400"><rect width="900" height="1400" fill="#eee9e0"/>${source}<rect x="40" y="40" width="250" height="42" rx="21" fill="#111" fill-opacity=".86"/><text x="165" y="67" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="white">DEMO FALLBACK PREVIEW</text><g transform="translate(340 980)">${rows}</g></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

async function invokeShopperFunction<T>(name: string, body: Record<string, unknown>) {
  if (!supabaseUrl || !supabasePublishableKey) throw new Error('Supabase is not configured.')
  const { id: sessionId, token } = getShopperSession()
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabasePublishableKey,
      'x-mirror-session-token': token,
    },
    body: JSON.stringify({ ...body, sessionId }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.details || payload?.error || `Function ${name} failed.`)
  return payload as T
}

function detectIntent(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('pair') || lower.includes('what can i wear') || lower.includes('what should i wear')) return 'pairing'
  if (lower.includes('interview') || lower.includes('wedding') || lower.includes('occasion')) return 'occasion'
  if (lower.includes('skin tone') || lower.includes('colour') || lower.includes('color')) return 'colour'
  if (lower.includes('budget') || lower.includes('under')) return 'budget'
  if (lower.includes('modest')) return 'modesty'
  if (lower.includes('casual')) return 'casual'
  if (lower.includes('formal')) return 'formal'
  return 'other'
}

export async function getMerchantBySlug(slug: string): Promise<Merchant | null> {
  if (demoMode) return slug === demoMerchant.slug || slug === 'tehila' ? demoMerchant : null
  const { data, error } = await supabase!.from('merchants').select('*').eq('slug', slug).single()
  if (error) return null
  return data as Merchant
}

export async function getMerchantByDomain(domain: string): Promise<Merchant | null> {
  if (demoMode) return demoMerchant.custom_domain === domain ? demoMerchant : null
  const { data, error } = await supabase!.from('merchants').select('*').eq('custom_domain', domain.toLowerCase()).maybeSingle()
  if (error) return null
  return data as Merchant | null
}

export async function resolveMerchant(slug?: string | null, domain?: string | null): Promise<Merchant | null> {
  if (domain) {
    const byDomain = await getMerchantByDomain(domain)
    if (byDomain) return byDomain
  }
  return slug ? getMerchantBySlug(slug) : null
}

export async function getOwnedMerchant(): Promise<Merchant | null> {
  if (demoMode) return demoMerchant
  const { data } = await supabase!.auth.getUser()
  const user = data.user
  if (!user) return null
  const { data: merchant, error } = await supabase!.from('merchants').select('*').eq('owner_user_id', user.id).limit(1).maybeSingle()
  if (error) throw error
  return merchant as Merchant | null
}

export async function getProducts(merchantId: string): Promise<Product[]> {
  if (demoMode) return demoProducts.filter((p) => p.merchant_id === merchantId && p.is_active)
  const { data, error } = await supabase!.from('products').select('*').eq('merchant_id', merchantId).eq('is_active', true).order('created_at')
  if (error) throw error
  return (data ?? []) as Product[]
}

export async function getProduct(productId: string): Promise<Product | null> {
  if (demoMode) return demoProducts.find((p) => p.id === productId) ?? null
  const { data, error } = await supabase!.from('products').select('*').eq('id', productId).single()
  if (error) return null
  return data as Product
}

export async function uploadShopperImage(file: File, merchantId: string, consentAt: string) {
  if (demoMode) return { id: crypto.randomUUID(), url: URL.createObjectURL(file), storagePath: 'demo/local', consentAt }
  const { id: sessionId } = getShopperSession()
  const data = await invokeShopperFunction<{ image: { id: string; signedUrl: string; storagePath: string } }>('upload-shopper-image', {
    merchantId,
    consentAt,
    fileName: file.name,
    contentType: file.type || 'image/jpeg',
    base64Data: await fileToBase64(file),
  })
  return { id: data.image.id, url: data.image.signedUrl, storagePath: data.image.storagePath, consentAt, sessionId }
}

export async function deleteShopperImage(imageId: string, storagePath: string, merchantId?: string) {
  if (demoMode) return
  await invokeShopperFunction('delete-shopper-image', { merchantId, imageId, storagePath })
}

export async function createTryOn(params: { merchantId: string; sessionId: string; shopperImageId?: string; shopperImageUrl?: string; productIds: string[]; mode: 'single' | 'complete_look'; parentGenerationId?: string }): Promise<TryOnGeneration> {
  if (demoMode) {
    await wait(350)
    return {
      id: crypto.randomUUID(), merchant_id: params.merchantId, session_id: params.sessionId,
      shopper_image_id: params.shopperImageId, shopperImageUrl: params.shopperImageUrl,
      productIds: params.productIds, mode: params.mode, parent_generation_id: params.parentGenerationId || null,
      status: 'preparing', output_image_url: buildDemoLookImage(params.shopperImageUrl, params.productIds),
      provider: 'demo-fallback', model: 'deterministic-preview', created_at: new Date().toISOString(),
    }
  }
  const data = await invokeShopperFunction<{ generation: TryOnGeneration }>('generate-try-on', {
    merchantId: params.merchantId,
    shopperImageId: params.shopperImageId,
    productIds: params.productIds,
    generationMode: params.mode,
    parentGenerationId: params.parentGenerationId,
  })
  return data.generation
}

export async function chatWithMirror(params: { conversationId?: string; merchantId: string; sessionId: string; message: string; selectedProductId?: string; generationId?: string; currentProductIds?: string[] }): Promise<{ conversationId: string; reply: MirrorReply }> {
  if (demoMode) {
    await wait(450)
    const selected = demoProducts.find((p) => p.id === params.selectedProductId)
    const currentProducts = demoProducts.filter((p) => params.currentProductIds?.includes(p.id))
    const lower = params.message.toLowerCase()
    const candidates = demoProducts.filter((p) => !params.currentProductIds?.includes(p.id) && p.id !== selected?.id)
    let recs = candidates.filter((p) => ['Tops', 'Bottoms', 'Shoes'].includes(p.category)).slice(0, 3)
    if (lower.includes('under') || lower.includes('budget')) recs = candidates.filter((p) => p.price <= 30000).slice(0, 3)
    if (lower.includes('modest')) recs = candidates.filter((p) => p.tags.includes('modest')).slice(0, 3)
    if (lower.includes('shoe')) recs = candidates.filter((p) => p.try_on_category === 'shoes').slice(0, 3)
    const name = selected?.name ?? currentProducts[0]?.name ?? 'this piece'
    const actions: MirrorReply['suggestedActions'] = []
    const removable = currentProducts.find((p) => lower.includes('remove') && (lower.includes(p.name.toLowerCase().split(' ')[0]) || lower.includes(p.try_on_category || '')))
    if (removable) actions.push({ type: 'remove_product', productId: removable.id, label: `Remove ${removable.name}` })
    if (lower.includes('casual') && recs[0]) {
      const target = currentProducts.find((p) => p.try_on_category === recs[0].try_on_category)
      actions.push({ type: target ? 'replace_product' : 'add_product', productId: recs[0].id, targetProductId: target?.id, label: target ? `Swap to ${recs[0].name}` : `Add ${recs[0].name}` })
    }
    if (!actions.length && recs.length) actions.push({ type: 'try_complete_look', label: 'Try recommended pieces together' })
    return {
      conversationId: params.conversationId ?? crypto.randomUUID(),
      reply: {
        message: lower.includes('skin tone')
          ? `${name} has a balanced, versatile colour story. From a photo I can comment on visual harmony, but lighting can shift how skin tone reads. I’d keep the rest of the look clean and neutral.`
          : lower.includes('interview')
            ? `Yes — ${name} can work well for an interview if the rest of the outfit stays polished. Keep the silhouette clean, shoes structured, and accessories restrained.`
            : lower.includes('remove') && removable
              ? `Yes. I can take ${removable.name} out of the current look and preserve the rest of the outfit.`
              : `I’d build around ${name} with pieces that keep the proportions intentional and the palette easy to wear. These are all from this store.`,
        recommendations: recs.map((p) => ({ productId: p.id, reason: `Pairs cleanly with ${name} and keeps the outfit cohesive.` })),
        suggestedActions: actions,
      },
    }
  }
  return invokeShopperFunction('chat-with-mirror', params)
}

export async function trackEvent(eventType: string, payload: Record<string, unknown>) {
  const event = { event_type: eventType, ...payload, created_at: new Date().toISOString() }
  if (demoMode) {
    const current = JSON.parse(localStorage.getItem('mirror_demo_events') || '[]')
    current.push(event)
    localStorage.setItem('mirror_demo_events', JSON.stringify(current.slice(-500)))
    return
  }
  const incomingMetadata = ((payload.metadata as Record<string, unknown> | undefined) || {})
  const metadata: Record<string, unknown> = { ...incomingMetadata }
  if (eventType === 'chat_message_sent' && !metadata.intent) metadata.intent = detectIntent(String(metadata.message || ''))
  await invokeShopperFunction('track-event', { eventType, ...payload, metadata })
}

export async function saveProduct(merchantId: string, input: Partial<Product> & { name: string; price: number; category: string; primary_image_url: string; product_url: string }, id?: string): Promise<Product> {
  if (demoMode) {
    if (id) {
      const existing = demoProducts.find((p) => p.id === id)
      if (!existing) throw new Error('Product not found')
      Object.assign(existing, input)
      return existing
    }
    const created: Product = {
      id: crypto.randomUUID(), merchant_id: merchantId, name: input.name, description: input.description || '', price: input.price, currency: input.currency || 'NGN',
      category: input.category, primary_image_url: input.primary_image_url, product_url: input.product_url, sizes: input.sizes || [], colours: input.colours || [], tags: input.tags || [], stock_status: input.stock_status || 'in_stock', is_active: true,
      try_on_category: input.try_on_category, reference_images: input.reference_images, visual_description: input.visual_description, generation_constraints: input.generation_constraints,
    }
    demoProducts.unshift(created); return created
  }
  const payload = { merchant_id: merchantId, ...input }
  if (id) { const { data, error } = await supabase!.from('products').update(payload).eq('id', id).eq('merchant_id', merchantId).select('*').single(); if (error) throw error; return data as Product }
  const { data, error } = await supabase!.from('products').insert(payload).select('*').single(); if (error) throw error; return data as Product
}

export async function archiveProduct(merchantId: string, id: string) {
  if (demoMode) { const p = demoProducts.find((x) => x.id === id); if (p) p.is_active = false; return }
  const { error } = await supabase!.from('products').update({ is_active: false }).eq('id', id).eq('merchant_id', merchantId); if (error) throw error
}

export async function deleteProduct(merchantId: string, id: string) {
  if (demoMode) { const i = demoProducts.findIndex((x) => x.id === id); if (i >= 0) demoProducts.splice(i, 1); return }
  const { error } = await supabase!.from('products').delete().eq('id', id).eq('merchant_id', merchantId); if (error) throw error
}

export async function updateMerchant(merchant: Merchant) {
  if (demoMode) { Object.assign(demoMerchant, merchant); return demoMerchant }
  const { data, error } = await supabase!.from('merchants').update({ name: merchant.name, slug: merchant.slug, description: merchant.description, website_url: merchant.website_url, custom_domain: merchant.custom_domain || null, currency: merchant.currency, primary_brand_colour: merchant.primary_brand_colour, storefront_config: merchant.storefront_config || {} }).eq('id', merchant.id).select('*').single(); if (error) throw error; return data as Merchant
}

export async function getAnalytics(merchantId: string): Promise<AnalyticsSummary> {
  if (demoMode) {
    const events: Array<Record<string, any>> = JSON.parse(localStorage.getItem('mirror_demo_events') || '[]')
    const count = (type: string) => events.filter((e) => e.event_type === type).length
    const productViews = Math.max(count('product_view'), 18)
    const starts = Math.max(count('try_on_started'), 11)
    const completed = Math.max(count('try_on_completed'), 9)
    const chats = Math.max(count('chat_started'), 7)
    const recClicks = Math.max(count('recommendation_clicked'), 5)
    const checkout = Math.max(count('checkout_clicked'), 3)

    const intentLabels: Record<string, string> = {
      pairing: 'Product pairing', occasion: 'Occasion suitability', colour: 'Colour compatibility',
      budget: 'Budget outfits', modesty: 'Modesty', casual: 'Make it casual', formal: 'Make it formal', other: 'Other',
    }
    const seededIntents: Record<string, number> = { pairing: 12, occasion: 8, colour: 7, budget: 5, modesty: 4 }
    for (const event of events.filter((e) => e.event_type === 'chat_message_sent')) {
      const intent = event.metadata?.intent || 'other'
      seededIntents[intent] = (seededIntents[intent] || 0) + 1
    }
    const intentTotal = Object.values(seededIntents).reduce((a, b) => a + b, 0) || 1
    const shopperIntents = Object.entries(seededIntents).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, value]) => ({ label: intentLabels[key] || key, count: value, share: Math.round((value / intentTotal) * 100) }))

    const topProducts = [demoProducts[0], demoProducts[6], demoProducts[11]].map((product, index) => ({
      productId: product.id, name: product.name, tryOns: [9, 6, 4][index], recommendationClicks: [3, 5, 4][index],
    }))

    return {
      productCount: demoProducts.length,
      tryOns: completed,
      conversations: chats,
      recommendationClicks: recClicks,
      checkoutClicks: checkout,
      funnel: [
        { label: 'Product views', value: productViews }, { label: 'Try-ons started', value: starts },
        { label: 'Try-ons completed', value: completed }, { label: 'Mirror conversations', value: chats },
        { label: 'Recommendation clicks', value: recClicks }, { label: 'Checkout clicks', value: checkout },
      ],
      shopperIntents,
      topProducts,
    }
  }
  const { data, error } = await supabase!.functions.invoke('merchant-analytics', { body: { merchantId } })
  if (error) throw error
  return data as AnalyticsSummary
}
