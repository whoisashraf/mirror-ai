import { getShopperSession } from '@/lib/session'
import { supabase, supabasePublishableKey, supabaseUrl } from '@/lib/supabase'
import type { AnalyticsSummary, Merchant, MirrorReply, Product, StylePreference, TryOnGeneration } from '@/types'

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

function errorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    try { return JSON.stringify(value) } catch { /* fall through */ }
  }
  return fallback
}

async function invokeShopperFunction<T>(name: string, body: Record<string, unknown>, requireAuth = false) {
  if (!supabaseUrl || !supabasePublishableKey) throw new Error('Supabase is not configured.')
  const { id: sessionId, token } = getShopperSession()
  const { data: { session } } = await supabase.auth.getSession()
  if (requireAuth && !session) throw new Error('Sign in to use virtual try-on.')
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || supabasePublishableKey}`,
      apikey: supabasePublishableKey,
      'x-mirror-session-token': token,
    },
    body: JSON.stringify({ ...body, sessionId }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(errorMessage(payload?.details ?? payload?.error, `Function ${name} failed.`))
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
  const { data, error } = await supabase.from('merchants').select('*').eq('slug', slug).single()
  if (error) return null
  return data as Merchant
}

export async function getMerchantByDomain(domain: string): Promise<Merchant | null> {
  const { data, error } = await supabase.from('merchants').select('*').eq('custom_domain', domain.toLowerCase()).maybeSingle()
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
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return null
  const { data: merchant, error } = await supabase.from('merchants').select('*').eq('owner_user_id', user.id).limit(1).maybeSingle()
  if (error) throw error
  return merchant as Merchant | null
}

export async function getProducts(merchantId: string): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').eq('merchant_id', merchantId).eq('is_active', true).order('created_at')
  if (error) throw error
  return (data ?? []) as Product[]
}

export async function getProduct(productId: string): Promise<Product | null> {
  const { data, error } = await supabase.from('products').select('*').eq('id', productId).single()
  if (error) return null
  return data as Product
}

export async function uploadShopperImage(file: File, merchantId: string, consentAt: string) {
  const { id: sessionId } = getShopperSession()
  const data = await invokeShopperFunction<{ image: { id: string; signedUrl: string; storagePath: string } }>('upload-shopper-image', {
    merchantId,
    consentAt,
    fileName: file.name,
    contentType: file.type || 'image/jpeg',
    base64Data: await fileToBase64(file),
  }, true)
  return { id: data.image.id, url: data.image.signedUrl, storagePath: data.image.storagePath, consentAt, sessionId }
}

export async function getBasePhotoUrl(merchantId: string, imageId: string) {
  const data = await invokeShopperFunction<{ image: { id: string; signedUrl: string; storagePath: string; consentAt: string } }>('get-base-photo-url', {
    merchantId,
    imageId,
  }, true)
  return data.image
}

export async function deleteShopperImage(imageId: string, storagePath: string, merchantId?: string) {
  await invokeShopperFunction('delete-shopper-image', { merchantId, imageId, storagePath }, true)
}

export async function createTryOn(params: { merchantId: string; sessionId: string; shopperImageId?: string; shopperImageUrl?: string; productIds: string[]; mode: 'single' | 'complete_look'; parentGenerationId?: string; stylePreference: StylePreference }): Promise<TryOnGeneration> {
  const data = await invokeShopperFunction<{ generation: TryOnGeneration }>('generate-try-on', {
    merchantId: params.merchantId,
    shopperImageId: params.shopperImageId,
    productIds: params.productIds,
    generationMode: params.mode,
    parentGenerationId: params.parentGenerationId,
    stylePreference: params.stylePreference,
  }, true)
  return data.generation
}

export async function getSavedLookUrls(merchantId: string, generationIds: string[]): Promise<Record<string, string>> {
  if (!generationIds.length) return {}
  const data = await invokeShopperFunction<{ urls: Record<string, string> }>('get-saved-look-urls', {
    merchantId,
    generationIds: [...new Set(generationIds)].slice(0, 20),
  }, true)
  return data.urls
}

export async function chatWithMirror(params: { conversationId?: string; merchantId: string; sessionId: string; message: string; selectedProductId?: string; generationId?: string; currentProductIds?: string[]; stylePreference: StylePreference }): Promise<{ conversationId: string; reply: MirrorReply }> {
  return invokeShopperFunction('chat-with-mirror', params, true)
}

export async function trackEvent(eventType: string, payload: Record<string, unknown>) {
  const incomingMetadata = ((payload.metadata as Record<string, unknown> | undefined) || {})
  const metadata: Record<string, unknown> = { ...incomingMetadata }
  if (eventType === 'chat_message_sent' && !metadata.intent) metadata.intent = detectIntent(String(metadata.message || ''))
  try {
    await invokeShopperFunction('track-event', { eventType, ...payload, metadata })
  } catch (error) {
    // Analytics must never prevent the storefront from loading or completing an action.
    console.warn('[Mirror analytics] Event tracking failed.', error)
  }
}

export async function saveProduct(merchantId: string, input: Partial<Product> & { name: string; price: number; category: string; primary_image_url: string; product_url: string }, id?: string): Promise<Product> {
  const payload = { merchant_id: merchantId, ...input }
  if (id) { const { data, error } = await supabase.from('products').update(payload).eq('id', id).eq('merchant_id', merchantId).select('*').single(); if (error) throw error; return data as Product }
  const { data, error } = await supabase.from('products').insert(payload).select('*').single(); if (error) throw error; return data as Product
}

export async function archiveProduct(merchantId: string, id: string) {
  const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id).eq('merchant_id', merchantId); if (error) throw error
}

export async function deleteProduct(merchantId: string, id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id).eq('merchant_id', merchantId); if (error) throw error
}

export async function updateMerchant(merchant: Merchant) {
  const { data, error } = await supabase.from('merchants').update({ name: merchant.name, slug: merchant.slug, description: merchant.description, website_url: merchant.website_url, custom_domain: merchant.custom_domain || null, currency: merchant.currency, primary_brand_colour: merchant.primary_brand_colour, storefront_config: merchant.storefront_config || {} }).eq('id', merchant.id).select('*').single(); if (error) throw error; return data as Merchant
}

export async function getAnalytics(merchantId: string): Promise<AnalyticsSummary> {
  const { data, error } = await supabase.functions.invoke('merchant-analytics', { body: { merchantId } })
  if (error) throw error
  return data as AnalyticsSummary
}
