import { corsHeaders } from '../_shared/cors.ts'
import { errorJson, json } from '../_shared/http.ts'
import { serviceClient } from '../_shared/auth.ts'
import { requireShopperSession } from '../_shared/session.ts'

const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY') || ''
const OPENROUTER_MODEL = Deno.env.get('OPENROUTER_CHAT_MODEL') || 'google/gemini-2.5-flash'
const actionTypes = ['try_complete_look','add_product','replace_product','remove_product','shop_look']
const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    message: { type: 'string' },
    recommendations: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, properties: { productId: { type: 'string' }, reason: { type: 'string' } }, required: ['productId','reason'] } },
    suggestedActions: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, properties: { type: { type: 'string', enum: actionTypes }, label: { type: 'string' }, productId: { type: 'string' }, targetProductId: { type: 'string' } }, required: ['type','label'] } },
  },
  required: ['message','recommendations','suggestedActions'],
}

async function askOpenRouter(messages: Array<{role:string;content:string}>) {
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
  if (!response.ok) throw new Error(payload?.error?.message || `OpenRouter failed (${response.status}).`)
  return JSON.parse(payload?.choices?.[0]?.message?.content || '{}')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorJson('Method not allowed.', 405)
  const service = serviceClient()
  try {
    const body = await req.json()
    const message = String(body.message || '').trim().slice(0, 1800)
    const merchantId = String(body.merchantId || '')
    const sessionId = String(body.sessionId || '')
    if (!merchantId || !sessionId || !message) return errorJson('Missing conversation context.')
    const shopperSession = await requireShopperSession(req, service, merchantId, sessionId)

    const { data: merchant, error: merchantError } = await service.from('merchants').select('id,name,currency').eq('id', merchantId).single()
    if (merchantError || !merchant) return errorJson('Merchant not found.', 404)

    const { data: catalogue, error: catalogueError } = await service.from('products').select('id,name,description,price,currency,category,try_on_category,colours,sizes,tags,stock_status').eq('merchant_id', merchant.id).eq('is_active', true).neq('stock_status', 'out_of_stock').limit(100)
    if (catalogueError) throw catalogueError
    const validIds = new Set((catalogue || []).map((p:any) => p.id))

    const currentProductIds = Array.isArray(body.currentProductIds) ? body.currentProductIds.map(String).filter((id:string) => validIds.has(id)).slice(0, 8) : []
    const currentProducts = (catalogue || []).filter((product:any) => currentProductIds.includes(product.id))

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

    const system = `You are Mirror, an AI fashion shopping assistant embedded inside ${merchant.name}.\nYour job is to help shoppers confidently choose and combine products sold by this merchant.\nOnly recommend products in the provided catalogue and always use exact product IDs.\nThe CURRENT LOOK is the authoritative outfit state. Never claim an item is in the look unless its ID appears there.\nYou may suggest interface actions: add_product, replace_product, remove_product, try_complete_look, or shop_look.\nFor remove_product, productId MUST already be in CURRENT LOOK.\nFor replace_product, productId is the new catalogue item and targetProductId is the CURRENT LOOK item being replaced.\nUse actions only when they clearly match what the shopper asked; the UI will require a tap before changing the look.\nNever make definitive fit or sizing claims when measurements are unavailable. A virtual try-on is only a visual approximation.\nIf discussing skin tone, acknowledge that photo lighting can affect visual assessment. Respect stated budgets.\nBe concise, warm, specific and commercially useful without being pushy. Return only the requested JSON structure.`
    const context = `SELECTED PRODUCT:\n${JSON.stringify(selected)}\n\nCURRENT LOOK (${currentProducts.length} products):\n${JSON.stringify(currentProducts)}\n\nAVAILABLE CATALOGUE (${catalogue?.length || 0} products):\n${JSON.stringify(catalogue)}`
    const messages = [{ role: 'system', content: system }, { role: 'system', content: context }, ...orderedHistory.map((m:any) => ({ role: m.role, content: m.content })), { role: 'user', content: message }]

    if (!OPENROUTER_KEY) return errorJson('OPENROUTER_API_KEY is not configured.', 503)
    const raw: any = await askOpenRouter(messages)

    const recommendations = Array.isArray(raw.recommendations)
      ? raw.recommendations.filter((r:any) => validIds.has(r.productId)).slice(0, 4).map((r:any) => ({ productId: r.productId, reason: String(r.reason || '').slice(0, 240) }))
      : []
    const currentSet = new Set(currentProductIds)
    const suggestedActions = Array.isArray(raw.suggestedActions)
      ? raw.suggestedActions.flatMap((action:any) => {
          const type = String(action?.type || '')
          if (!actionTypes.includes(type)) return []
          const next: Record<string, string> = { type, label: String(action?.label || 'Update look').slice(0, 100) }
          if (action?.productId && validIds.has(String(action.productId))) next.productId = String(action.productId)
          if (action?.targetProductId && currentSet.has(String(action.targetProductId))) next.targetProductId = String(action.targetProductId)
          if (type === 'remove_product' && (!next.productId || !currentSet.has(next.productId))) return []
          if ((type === 'add_product' || type === 'replace_product') && !next.productId) return []
          return [next]
        }).slice(0, 4)
      : []

    if (!suggestedActions.length && recommendations.length) suggestedActions.push({ type: 'try_complete_look', label: 'Try recommended pieces together' })
    const reply = { message: String(raw.message || 'I can help you style this from the available catalogue.').slice(0, 1600), recommendations, suggestedActions }

    const { error: msgError } = await service.from('messages').insert([
      { conversation_id: conversation.id, role: 'user', content: message },
      { conversation_id: conversation.id, role: 'assistant', content: reply.message, structured_data: { recommendations: reply.recommendations, suggestedActions: reply.suggestedActions } },
    ])
    if (msgError) throw msgError

    if (recommendations.length) {
      await service.from('analytics_events').insert({ merchant_id: merchant.id, session_id: sessionId, shopper_session_id: shopperSession.id, event_type: 'recommendation_shown', product_id: body.selectedProductId || currentProductIds[0] || null, generation_id: body.generationId || null, conversation_id: conversation.id, metadata: { recommendedProductIds: recommendations.map((r:any) => r.productId), currentProductIds } })
    }
    return json({ conversationId: conversation.id, reply })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.startsWith('SESSION_')) return errorJson('Invalid shopper session.', 401, message)
    console.error(error)
    return errorJson('Mirror could not answer right now.', 500, message)
  }
})
