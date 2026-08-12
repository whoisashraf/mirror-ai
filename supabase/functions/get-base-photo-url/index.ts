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
    const imageId = String(body.imageId || '')
    if (!merchantId || !sessionId || !imageId) return errorJson('Missing base-photo context.', 422)

    const session = await requireShopperSession(req, service, merchantId, sessionId, user.id)
    const { data: image, error } = await service
      .from('shopper_images')
      .select('id,storage_path,consent_at')
      .eq('id', imageId)
      .eq('shopper_session_id', session.id)
      .single()
    if (error || !image) return errorJson('Base photo not found.', 404)

    const { data: signed, error: signedError } = await service.storage
      .from('shopper-images')
      .createSignedUrl(image.storage_path, 60 * 30)
    if (signedError) throw signedError

    return json({ image: { id:image.id, storagePath:image.storage_path, signedUrl:signed.signedUrl, consentAt:image.consent_at } })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'AUTH_REQUIRED') return errorJson('Sign in to restore your base photo.', 401)
    if (message.startsWith('SESSION_')) return errorJson('This base-photo session is no longer available.', 401, message)
    console.error(error)
    return errorJson('Could not restore base photo.', 500, message)
  }
})
