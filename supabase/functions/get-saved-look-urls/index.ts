import { corsHeaders } from '../_shared/cors.ts'
import { errorJson, json } from '../_shared/http.ts'
import { requireUser, serviceClient } from '../_shared/auth.ts'
import { requireShopperSession } from '../_shared/session.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorJson('Method not allowed.', 405)

  const service = serviceClient()
  try {
    const user = await requireUser(req, service)
    const body = await req.json()
    const merchantId = String(body.merchantId || '')
    const sessionId = String(body.sessionId || '')
    const generationIds = Array.isArray(body.generationIds)
      ? [...new Set(body.generationIds.map(String))].slice(0, 20)
      : []
    if (!merchantId || !sessionId || !generationIds.length) return errorJson('Missing saved-look context.', 422)

    const shopperSession = await requireShopperSession(req, service, merchantId, sessionId, user.id)
    const { data: generations, error } = await service
      .from('try_on_generations')
      .select('id,output_storage_path')
      .in('id', generationIds)
      .eq('merchant_id', merchantId)
      .eq('shopper_session_id', shopperSession.id)
      .eq('status', 'completed')
      .not('output_storage_path', 'is', null)
    if (error) throw error

    const urls: Record<string, string> = {}
    await Promise.all((generations || []).map(async (generation) => {
      const { data, error: signedError } = await service.storage
        .from('try-on-results')
        .createSignedUrl(generation.output_storage_path, 60 * 60)
      if (signedError) throw signedError
      urls[generation.id] = data.signedUrl
    }))

    return json({ urls })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'AUTH_REQUIRED') return errorJson('Sign in to view saved looks.', 401)
    if (message.startsWith('SESSION_')) return errorJson('This saved-look session is no longer available.', 401, message)
    console.error(error)
    return errorJson('Could not load saved looks.', 500, message)
  }
})
