import { corsHeaders } from '../_shared/cors.ts'
import { errorJson, json } from '../_shared/http.ts'
import { requireUser, serviceClient } from '../_shared/auth.ts'
import { requireShopperSession } from '../_shared/session.ts'

const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY') || ''
const IMAGE_MODEL = Deno.env.get('OPENROUTER_IMAGE_MODEL') || 'google/gemini-3.1-flash-image'
const PRECISION_MODEL = Deno.env.get('OPENROUTER_PRECISION_IMAGE_MODEL') || 'google/gemini-3-pro-image'
const QA_MODEL = Deno.env.get('OPENROUTER_QA_MODEL') || 'google/gemini-2.5-flash'
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173'

const bytes = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
async function base64(blob: Blob) { const bytes = new Uint8Array(await blob.arrayBuffer()); let out=''; for (let i=0;i<bytes.length;i+=32768) out += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(out) }
function dataUrl(image: { data: string; mime: string }) { return `data:${image.mime};base64,${image.data}` }
async function fetchImage(url: string) { const response = await fetch(url); if (!response.ok) throw new Error(`Could not retrieve reference image (${response.status}).`); const blob = await response.blob(); return { data: await base64(blob), mime: blob.type || 'image/jpeg' } }
function needsPrecision(products: any[]) { return products.length > 2 || products.some((p) => ['shoes','bag','earrings','necklace','headwear','other_accessory'].includes(p.try_on_category)) }
function productRule(product: any) {
  const base = `PRODUCT ${product.id} is ${product.name}. Preserve exact visible colour, silhouette, proportions, material, pattern, hardware and distinctive details. Never invent logos or embellishments. Render this product exactly once.`
  switch (product.try_on_category) {
    case 'outerwear': return `${base} The shopper must wear it normally on the torso as the outermost clothing layer. Never place it in a hand, over an arm, on a shoulder, beside the shopper or elsewhere in the scene.`
    case 'top': return `${base} The shopper must wear it normally on the torso, beneath outerwear when outerwear is selected. Never duplicate it or place a spare garment in the scene.`
    case 'dress': return `${base} The shopper must wear it normally as the primary garment. Never add a second copy or a spare garment.`
    case 'shoes': return `${base} Replace only footwear. Render a consistent left/right pair. Preserve toe, sole, heel and closure.`
    case 'bag': return `${base} This is the only selected category that may be naturally carried in a hand or worn on the shoulder. Preserve bag shape, straps and hardware.`
    case 'earrings': return `${base} Apply to visible ears where appropriate. Preserve scale and geometry.`
    case 'necklace': return `${base} Place naturally around the neck/chest. Preserve chain and pendant geometry.`
    case 'bottom': return `${base} Replace or style the lower-body garment while preserving unrelated garments.`
    default: return base
  }
}
async function imageRequest(model: string, prompt: string, references: { data: string; mime: string }[]) {
  const response = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': SITE_URL, 'X-Title': 'Mirror AI' },
    body: JSON.stringify({ model, prompt, n: 1, resolution: '1K', aspect_ratio: '4:5', output_format: 'png', input_references: references.map((image) => ({ type: 'image_url', image_url: { url: dataUrl(image) } })) }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload?.error?.message || `OpenRouter image request failed (${response.status}).`)
  const item = payload?.data?.[0]
  if (!item?.b64_json) throw new Error('OpenRouter returned no image.')
  return { output: { data: item.b64_json, mime: item.media_type || 'image/png' }, usage: payload?.usage || {} }
}
async function qa(output: { data: string; mime: string }, products: any[], refs: { productId: string; image: { data: string; mime: string } }[]) {
  try {
    const content: any[] = [{ type: 'text', text: `Compare the generated fashion image with exact merchant references and inspect scene logic. Return JSON {"overall":0.0,"compositionValid":true,"compositionProblems":["..."],"products":[{"productId":"uuid","fidelity":0.0,"problems":["..."]}]}. Set compositionValid=false and reduce overall heavily if any garment is duplicated, floating, displayed beside the shopper, draped over an arm, or held in a hand. Every selected clothing product must be worn exactly once in its anatomically correct location; only a selected bag may be carried. Also penalize wrong colour, silhouette, shoe shape, heel/sole, bag shape/strap/hardware, jewellery geometry, patterns, logos or missing items. Products: ${products.map((p) => `${p.id}:${p.name}(${p.try_on_category})`).join('; ')}` }, { type: 'image_url', image_url: { url: dataUrl(output) } }]
    for (const ref of refs) content.push({ type: 'text', text: `Exact reference for ${ref.productId}` }, { type: 'image_url', image_url: { url: dataUrl(ref.image) } })
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': SITE_URL, 'X-Title': 'Mirror AI' },
      body: JSON.stringify({ model: QA_MODEL, messages: [{ role: 'user', content }], temperature: 0, response_format: { type: 'json_object' } }),
    })
    if (!response.ok) return { overall: 0.75, products: [], qaUnavailable: true }
    const payload = await response.json()
    return JSON.parse(payload?.choices?.[0]?.message?.content || '{}')
  } catch { return { overall: 0.75, products: [], qaUnavailable: true } }
}
async function sha256(value: string) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('') }
async function rateLimit(service: any, bucket: string, key: string, max: number, windowMs: number) {
  const keyHash = await sha256(key)
  const since = new Date(Date.now() - windowMs).toISOString()
  const { count } = await service.from('rate_limit_events').select('*', { count: 'exact', head: true }).eq('bucket', bucket).eq('key_hash', keyHash).gte('created_at', since)
  if ((count || 0) >= max) throw new Error('RATE_LIMIT')
  await service.from('rate_limit_events').insert({ bucket, key_hash: keyHash })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorJson('Method not allowed.', 405)
  const service = serviceClient()
  let generationId: string | null = null
  try {
    await requireUser(req, service)
    if (!OPENROUTER_KEY) return errorJson('OPENROUTER_API_KEY is not configured.', 503)
    const body = await req.json()
    const merchantId = String(body.merchantId || '')
    const sessionId = String(body.sessionId || '')
    const shopperImageId = String(body.shopperImageId || '')
    const generationMode = String(body.generationMode || 'single')
    const productIds = Array.isArray(body.productIds) ? body.productIds.map(String) : []
    if (!merchantId || !sessionId || !shopperImageId || !productIds.length) return errorJson('Missing generation context.')
    const shopperSession = await requireShopperSession(req, service, merchantId, sessionId)
    await rateLimit(service, 'shopper-hour', `${shopperSession.id}:${sessionId}`, 5, 60 * 60 * 1000)
    await rateLimit(service, 'merchant-day', merchantId, 150, 24 * 60 * 60 * 1000)

    const { data: sourceImage } = await service.from('shopper_images').select('id,storage_path,shopper_session_id').eq('id', shopperImageId).eq('shopper_session_id', shopperSession.id).single()
    if (!sourceImage) return errorJson('Shopper image not found.', 404)

    const { data: products, error: productError } = await service.from('products').select('id,merchant_id,name,description,try_on_category,primary_image_url,reference_images').in('id', productIds).eq('merchant_id', merchantId).eq('is_active', true)
    if (productError) throw productError
    if (!products || products.length !== productIds.length) return errorJson('One or more products are unavailable.')

    let parent: any = null
    if (body.parentGenerationId) {
      const { data } = await service.from('try_on_generations').select('id,output_storage_path,shopper_session_id').eq('id', body.parentGenerationId).eq('merchant_id', merchantId).eq('shopper_session_id', shopperSession.id).eq('status', 'completed').maybeSingle()
      parent = data
    }

    const model = needsPrecision(products) ? PRECISION_MODEL : IMAGE_MODEL
    const prompt = `Create one coherent photorealistic virtual fashion try-on image. ORIGINAL SHOPPER is the identity anchor: preserve recognizable identity, face, skin tone, body proportions, pose, hands and anatomy. ${parent ? 'CURRENT LOOK is the latest visual state; edit it rather than restarting.' : 'Start from the original shopper.'} ${products.map(productRule).join(' ')} OUTFIT LOGIC IS MANDATORY: every selected clothing product is worn exactly once in its anatomically correct position and correct layer order. Do not duplicate any garment. Do not show spare clothing, clothing on hangers, clothing in the shopper's hands, clothing draped over an arm or shoulder, floating products, product cutouts, inset panels, collages or catalogue displays. A hand may hold a product only when that selected product is a bag. Product reference images are source material only, never additional objects to reproduce in the scene. Use only supplied merchant products and never substitute generic lookalikes. Keep the shopper's hands natural and empty unless carrying a selected bag. Natural realistic lighting. Visual approximation only; not a fit guarantee.`
    const { data: generation, error: generationError } = await service.from('try_on_generations').insert({ merchant_id: merchantId, shopper_session_id: shopperSession.id, session_id: sessionId, shopper_image_id: shopperImageId, status: 'generating', generation_mode: generationMode, parent_generation_id: parent?.id || null, provider: 'openrouter', model, prompt }).select('*').single()
    if (generationError) throw generationError
    generationId = generation.id
    await service.from('try_on_products').insert(productIds.map((productId: string) => ({ generation_id: generation.id, product_id: productId })))

    const refs: { data: string; mime: string }[] = []
    if (parent?.output_storage_path) {
      const { data } = await service.storage.from('try-on-results').download(parent.output_storage_path)
      if (data) refs.push({ data: await base64(data), mime: data.type || 'image/png' })
    }
    const { data: shopperBlob } = await service.storage.from('shopper-images').download(sourceImage.storage_path)
    if (!shopperBlob) throw new Error('Could not read shopper image.')
    refs.push({ data: await base64(shopperBlob), mime: shopperBlob.type || 'image/jpeg' })

    const productRefs: { productId: string; image: { data: string; mime: string } }[] = []
    for (const product of products) {
      const urls = [product.primary_image_url, ...((product.reference_images || []) as any[]).map((item) => item?.url).filter(Boolean)]
      for (const url of [...new Set(urls)].slice(0, products.length > 2 ? 2 : 3)) {
        const image = await fetchImage(String(url))
        productRefs.push({ productId: product.id, image })
        refs.push(image)
      }
    }

    let generated = await imageRequest(model, prompt, refs)
    let fidelity = await qa(generated.output, products, productRefs)
    let correctionAttempted = false
    if (Number(fidelity?.overall || 0) < 0.72 || fidelity?.compositionValid === false || (fidelity?.compositionProblems?.length || 0) > 0) {
      correctionAttempted = true
      generated = await imageRequest(model, `Correct this current generated fashion look into one logical outfit. Scene-logic QA found: ${JSON.stringify(fidelity?.compositionProblems || [])}. Product-fidelity QA found: ${JSON.stringify(fidelity?.products || [])}. Preserve shopper identity, anatomy, pose and already-correct elements. Every selected garment must be worn exactly once in its correct body location and layer order. Remove all duplicate, spare, held, draped, floating or displayed garments; only a selected bag may be carried. Reference images are source material only and must not appear as extra scene objects.`, [generated.output, ...productRefs.map((ref) => ref.image)])
      fidelity = await qa(generated.output, products, productRefs)
    }

    const path = `${merchantId}/${sessionId}/${generation.id}.png`
    const { error: uploadError } = await service.storage.from('try-on-results').upload(path, bytes(generated.output.data), { contentType: generated.output.mime, upsert: false })
    if (uploadError) throw uploadError
    const { data: signed, error: signedError } = await service.storage.from('try-on-results').createSignedUrl(path, 60 * 60)
    if (signedError) throw signedError

    const { data: completed, error: updateError } = await service.from('try_on_generations').update({ status: 'completed', output_storage_path: path, completed_at: new Date().toISOString(), token_usage: generated.usage || {}, estimated_cost: Number(generated.usage?.cost) || null, fidelity_report: fidelity, correction_attempted: correctionAttempted }).eq('id', generation.id).select('*').single()
    if (updateError) throw updateError
    return json({ generation: { ...completed, productIds, mode: generationMode, output_image_url: signed.signedUrl } })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (generationId) await service.from('try_on_generations').update({ status: 'failed', error: message, completed_at: new Date().toISOString() }).eq('id', generationId)
    if (message === 'AUTH_REQUIRED') return errorJson('Sign in to generate a try-on.', 401)
    if (message.startsWith('SESSION_')) return errorJson('Invalid shopper session.', 401, message)
    if (message === 'RATE_LIMIT') return errorJson('Generation limit reached. Please try again later.', 429)
    console.error(error)
    return errorJson('Try-on generation failed.', 500, message)
  }
})
