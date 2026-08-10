import { corsHeaders } from '../_shared/cors.ts'
import { errorJson, json } from '../_shared/http.ts'
import { serviceClient } from '../_shared/auth.ts'
import { requireShopperSession } from '../_shared/session.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorJson('Method not allowed.', 405)
  const service = serviceClient()
  try {
    const body = await req.json()
    const merchantId = String(body.merchantId || '')
    const sessionId = String(body.sessionId || '')
    const eventType = String(body.eventType || '').trim()
    if (!merchantId || !sessionId || !eventType) return errorJson('Missing event payload.')
    const shopperSession = await requireShopperSession(req, service, merchantId, sessionId)
    const { error } = await service.from('analytics_events').insert({
      merchant_id: merchantId,
      session_id: sessionId,
      shopper_session_id: shopperSession.id,
      event_type: eventType,
      product_id: body.productId || null,
      generation_id: body.generationId || null,
      conversation_id: body.conversationId || null,
      metadata: body.metadata || {},
    })
    if (error) throw error
    return json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.startsWith('SESSION_')) return errorJson('Invalid shopper session.', 401, message)
    console.error(error)
    return errorJson('Event tracking failed.', 500, message)
  }
})
