import { corsHeaders } from '../_shared/cors.ts'
import { errorJson, json } from '../_shared/http.ts'
import { requireUser, serviceClient } from '../_shared/auth.ts'
import { findOwnedGeneration, findOwnedShopperImage, requireShopperSession } from '../_shared/session.ts'

const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY') || ''
const OPENROUTER_MODEL = Deno.env.get('OPENROUTER_CHAT_MODEL') || 'google/gemini-2.5-flash'
const actionTypes = ['try_complete_look','add_product','replace_product','remove_product','shop_look']
const candidateLimit = 12

const stopWords = new Set(['about','after','again','also','and','are','around','can','complete','could','does','for','from','have','how','into','look','make','more','should','that','the','this','what','with','would','your'])
function words(value: unknown) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9₦]+/g, ' ').split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word))
}
function productText(product: any) {
  return [product.name, product.description, product.visual_description, product.category, product.try_on_category, ...(product.colours || []), ...(product.tags || [])].join(' ')
}
function chooseVisualCandidates(catalogue: any[], currentProducts: any[], message: string, selectedProductId: string, stylePreference: string) {
  const currentIds = new Set(currentProducts.map((product) => product.id))
  const queryWords = new Set(words(message))
  const currentWords = new Set(currentProducts.flatMap((product) => words(productText(product))))
  const currentCategories = new Set(currentProducts.map((product) => product.try_on_category).filter(Boolean))
  const ranked = catalogue
    .filter((product) => !currentIds.has(product.id) && product.id !== selectedProductId && /^https?:\/\//i.test(String(product.primary_image_url || '')))
    .map((product) => {
      const candidateWords = new Set(words(productText(product)))
      let score = product.style_audience === stylePreference ? 8 : product.style_audience === 'unisex' ? 2 : 0
      for (const word of queryWords) if (candidateWords.has(word)) score += 5
      for (const word of currentWords) if (candidateWords.has(word)) score += 1
      if (!currentCategories.has(product.try_on_category)) score += 3
      if (product.stock_status === 'low_stock') score -= 1
      return { product, score }
    })
    .sort((a, b) => b.score - a.score || String(a.product.name).localeCompare(String(b.product.name)))

  const selected: any[] = []
  const represented = new Set<string>()
  for (const item of ranked) {
    const category = String(item.product.try_on_category || item.product.category || '')
    if (!represented.has(category)) {
      selected.push(item.product)
      represented.add(category)
    }
    if (selected.length >= candidateLimit) return selected
  }
  for (const item of ranked) {
    if (!selected.some((product) => product.id === item.product.id)) selected.push(item.product)
    if (selected.length >= candidateLimit) break
  }
  return selected
}

async function dataUrl(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768))
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`
}

function errorMessage(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    try { return JSON.stringify(value) } catch { /* fall through */ }
  }
  return 'Unknown error'
}

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    message: { type: 'string' },
    recommendations: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, properties: { productId: { type: 'string' }, reason: { type: 'string' } }, required: ['productId','reason'] } },
    suggestedActions: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, properties: { type: { type: 'string', enum: actionTypes }, label: { type: 'string' }, productId: { type: 'string' }, targetProductId: { type: 'string' } }, required: ['type','label'] } },
  },
  required: ['message','recommendations','suggestedActions'],
}

async function askOpenRouter(messages: Array<{role:string;content:any}>) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': Deno.env.get('SITE_URL') || 'http://localhost:5173',
      'X-Title': 'Mirror AI',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature: 0.3,
      response_format: { type: 'json_schema', json_schema: { name: 'mirror_reply', strict: true, schema } },
    }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(errorMessage(payload?.error?.message ?? payload?.error ?? `OpenRouter failed (${response.status}).`))
  return JSON.parse(payload?.choices?.[0]?.message?.content || '{}')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorJson('Method not allowed.', 405)
  const service = serviceClient()
  try {
    const user = await requireUser(req, service)
    const body = await req.json()
    const message = String(body.message || '').trim().slice(0, 1800)
    const merchantId = String(body.merchantId || '')
    const sessionId = String(body.sessionId || '')
    const stylePreference = String(body.stylePreference || '')
    const requestedShopperImageId = String(body.shopperImageId || '')
    if (!merchantId || !sessionId || !message) return errorJson('Missing conversation context.')
    if (!['menswear','womenswear','any'].includes(stylePreference)) return errorJson('Choose a valid clothing preference.', 422)
    const shopperSession = await requireShopperSession(req, service, merchantId, sessionId, user.id)

    const { data: merchant, error: merchantError } = await service.from('merchants').select('id,name,currency').eq('id', merchantId).single()
    if (merchantError || !merchant) return errorJson('Merchant not found.', 404)

    const { data: allCatalogue, error: catalogueError } = await service.from('products').select('id,name,description,price,currency,category,try_on_category,style_audience,colours,sizes,tags,stock_status,primary_image_url,reference_images,visual_description').eq('merchant_id', merchant.id).eq('is_active', true).neq('stock_status', 'out_of_stock').limit(100)
    if (catalogueError) throw catalogueError
    const catalogue = (allCatalogue || []).filter((product:any) => stylePreference === 'any' || product.style_audience === 'unisex' || product.style_audience === stylePreference)
    const validIds = new Set((catalogue || []).map((p:any) => p.id))

    const currentProductIds = Array.isArray(body.currentProductIds) ? body.currentProductIds.map(String).filter((id:string) => validIds.has(id)).slice(0, 8) : []
    const currentProducts = (catalogue || []).filter((product:any) => currentProductIds.includes(product.id))
    const visualCandidates = chooseVisualCandidates(catalogue || [], currentProducts, message, String(body.selectedProductId || ''), stylePreference)
    const visualCandidateIds = new Set(visualCandidates.map((product:any) => product.id))

    let conversation: any = null
    if (body.conversationId) {
      const { data } = await service.from('conversations').select('*').eq('id', body.conversationId).eq('shopper_session_id', shopperSession.id).eq('merchant_id', merchant.id).maybeSingle()
      conversation = data
      if (!conversation) return errorJson('Conversation not found.', 404)
    } else {
      const { data, error } = await service.from('conversations').insert({ merchant_id: merchant.id, shopper_session_id: shopperSession.id, session_id: sessionId, selected_product_id: body.selectedProductId || null, generation_id: body.generationId || null }).select('*').single()
      if (error) throw error
      conversation = data
    }

    const selected = body.selectedProductId ? catalogue?.find((p:any) => p.id === body.selectedProductId) || null : null
    const { data: history } = await service.from('messages').select('role,content').eq('conversation_id', conversation.id).order('created_at', { ascending: false }).limit(12)
    const orderedHistory = [...(history || [])].reverse()

    let generation: any = null
    let currentLookImage = ''
    if (body.generationId) {
      generation = await findOwnedGeneration(service, merchant.id, user.id, String(body.generationId), true)
      if (generation?.output_storage_path) {
        const { data: image } = await service.storage.from('try-on-results').download(generation.output_storage_path)
        if (image) currentLookImage = await dataUrl(image)
      }
    }

    let basePhotoImage = ''
    const shopperImageId = requestedShopperImageId || String(generation?.shopper_image_id || '')
    if (shopperImageId) {
      const sourceImage = await findOwnedShopperImage(service, merchant.id, user.id, shopperImageId)
      if (!sourceImage && requestedShopperImageId) return errorJson('Shopper photo not found for this private session.', 404)
      if (sourceImage?.storage_path) {
        const { data: image } = await service.storage.from('shopper-images').download(sourceImage.storage_path)
        if (image) basePhotoImage = await dataUrl(image)
      }
    }

    const system = `You are Mirror, a visual AI fashion stylist embedded inside ${merchant.name}.\nYour job is to inspect the shopper and current outfit, compare the actual candidate product images, and recommend the most visually coherent products sold by this merchant.\nSHOPPER-SELECTED COLLECTION: ${stylePreference.toUpperCase()}. This explicit choice is authoritative. Style within it; do not infer gender identity from appearance.\nOnly recommend products labelled VISUAL CANDIDATE and always use exact product IDs. You have received an image for every eligible candidate, so do not choose from names or metadata alone.\nThe CURRENT LOOK is the authoritative outfit state. Never claim an item is in the look unless its ID appears there.\nEvaluate observable styling signals: colour harmony and contrast, silhouette balance, proportions, layer order, formality, coverage, occasion, and missing outfit categories. Use the BASE PHOTO for the shopper's visible palette, proportions and presentation, and the CURRENT LOOK for outfit coherence. Lighting can distort colour, so express colour observations as visual guidance rather than certainty.\nEvery recommendation reason must cite at least one specific observed visual relationship between that candidate and the shopper or current look. Avoid generic reasons such as versatile, sophisticated, professional, classic, or completes the look unless you explain the visible colour, shape, proportion or styling relationship.\nYou may suggest interface actions: add_product, replace_product, remove_product, try_complete_look, or shop_look.\nFor remove_product, productId MUST already be in CURRENT LOOK.\nFor replace_product, productId is the new visual candidate and targetProductId is the CURRENT LOOK item being replaced.\nUse actions only when they clearly match what the shopper asked; the UI will require a tap before changing the look.\nNever make definitive fit or sizing claims when measurements are unavailable. A virtual try-on is only a visual approximation. Respect stated budgets.\nBe concise, warm, specific and commercially useful without being pushy. Return only the requested JSON structure.`
    const groundingRules = `Do not assign gender, ethnicity, health, age or identity from appearance. The selected collection supplies presentation direction. Never explain product suitability as the shopper looking male or female; explain visible fashion factors such as palette, silhouette, length, scale, structure, material and occasion. Never say an item was added, removed or replaced—the UI only performs changes after the shopper taps an action. Say you can remove or replace it and provide the corresponding action. If the requested occasion or style direction is genuinely ambiguous and materially affects the answer, ask one short clarifying question and return no recommendations instead of guessing. For court, legal, interview, office or other formal-professional contexts, prioritize conservative tailoring, appropriate coverage, restrained colours and conventional formal footwear unless the shopper requests otherwise.`
    const compactProduct = (product:any) => ({ id:product.id, name:product.name, description:product.description, price:product.price, currency:product.currency, category:product.category, try_on_category:product.try_on_category, style_audience:product.style_audience, colours:product.colours, sizes:product.sizes, tags:product.tags, stock_status:product.stock_status, visual_description:product.visual_description })
    const context = `SELECTED PRODUCT:\n${JSON.stringify(selected ? compactProduct(selected) : null)}\n\nCURRENT LOOK (${currentProducts.length} products):\n${JSON.stringify(currentProducts.map(compactProduct))}\n\nVISUAL CANDIDATES (${visualCandidates.length} products; recommendation IDs must come only from this list):\n${JSON.stringify(visualCandidates.map(compactProduct))}`
    const userContent: any[] = [{ type:'text', text:`SHOPPER REQUEST:\n${message}\n\nInspect all labelled images before recommending anything.` }]
    if (basePhotoImage) userContent.push({ type:'text', text:'BASE PHOTO — use for observable palette, proportions and presentation; do not infer identity.' }, { type:'image_url', image_url:{ url:basePhotoImage } })
    if (currentLookImage) userContent.push({ type:'text', text:'CURRENT GENERATED LOOK — use as the primary outfit-coherence reference.' }, { type:'image_url', image_url:{ url:currentLookImage } })
    const visualProducts = [...currentProducts, ...(selected ? [selected] : []), ...visualCandidates].filter((product, index, products) => products.findIndex((item) => item.id === product.id) === index)
    for (const product of visualProducts) {
      if (!/^https?:\/\//i.test(String(product.primary_image_url || ''))) continue
      const label = visualCandidateIds.has(product.id) ? 'VISUAL CANDIDATE' : 'CURRENT/SELECTED PRODUCT REFERENCE'
      userContent.push({ type:'text', text:`${label} — ${product.id} — ${product.name}` }, { type:'image_url', image_url:{ url:product.primary_image_url } })
    }
    const messages = [{ role: 'system', content: system }, { role: 'system', content: groundingRules }, { role: 'system', content: context }, ...orderedHistory.map((m:any) => ({ role: m.role, content: m.content })), { role: 'user', content: userContent }]

    if (!OPENROUTER_KEY) return errorJson('OPENROUTER_API_KEY is not configured.', 503)
    const raw: any = await askOpenRouter(messages)

    const recommendations = Array.isArray(raw.recommendations)
      ? raw.recommendations.filter((r:any) => visualCandidateIds.has(r.productId)).slice(0, 4).map((r:any) => ({ productId: r.productId, reason: String(r.reason || '').slice(0, 240) }))
      : []
    const currentSet = new Set(currentProductIds)
    const suggestedActions = Array.isArray(raw.suggestedActions)
      ? raw.suggestedActions.flatMap((action:any) => {
          const type = String(action?.type || '')
          if (!actionTypes.includes(type)) return []
          const next: Record<string, string> = { type, label: String(action?.label || 'Update look').slice(0, 100) }
          if (action?.productId && (visualCandidateIds.has(String(action.productId)) || currentSet.has(String(action.productId)))) next.productId = String(action.productId)
          if (action?.targetProductId && currentSet.has(String(action.targetProductId))) next.targetProductId = String(action.targetProductId)
          if (type === 'remove_product' && (!next.productId || !currentSet.has(next.productId))) return []
          if ((type === 'add_product' || type === 'replace_product') && (!next.productId || !visualCandidateIds.has(next.productId))) return []
          return [next]
        }).slice(0, 4)
      : []

    if (!suggestedActions.length && recommendations.length) suggestedActions.push({ type: 'try_complete_look', label: 'Try recommended pieces together' })
    const reply = { message: String(raw.message || 'I can help you style this from the available catalogue.').slice(0, 1600), recommendations, suggestedActions }

    const { error: msgError } = await service.from('messages').insert([
      { conversation_id: conversation.id, role: 'user', content: message, structured_data: {} },
      { conversation_id: conversation.id, role: 'assistant', content: reply.message, structured_data: { recommendations: reply.recommendations, suggestedActions: reply.suggestedActions } },
    ])
    if (msgError) throw new Error(errorMessage(msgError))

    if (recommendations.length) {
      await service.from('analytics_events').insert({ merchant_id: merchant.id, session_id: sessionId, shopper_session_id: shopperSession.id, event_type: 'recommendation_shown', product_id: body.selectedProductId || currentProductIds[0] || null, generation_id: body.generationId || null, conversation_id: conversation.id, metadata: { recommendedProductIds: recommendations.map((r:any) => r.productId), currentProductIds } })
    }
    return json({ conversationId: conversation.id, reply })
  } catch (error) {
    const message = errorMessage(error)
    if (message === 'AUTH_REQUIRED') return errorJson('Sign in to chat with Mirror.', 401)
    if (message.startsWith('SESSION_')) return errorJson('Invalid shopper session.', 401, message)
    console.error(error)
    return errorJson('Mirror could not answer right now.', 500, message)
  }
})
