import { corsHeaders } from '../_shared/cors.ts'
import { errorJson, json } from '../_shared/http.ts'
import { requireUser, serviceClient } from '../_shared/auth.ts'
import { findOwnedShopperImage, requireShopperSession } from '../_shared/session.ts'

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
    if (!merchantId || !sessionId || !imageId) return errorJson('Missing delete parameters.')
    await requireShopperSession(req, service, merchantId, sessionId, user.id)
    const row = await findOwnedShopperImage(service, merchantId, user.id, imageId)
    if (!row) return errorJson('Shopper image not found.', 404)
    const { data: generations, error: generationsError } = await service.from('try_on_generations').select('output_storage_path').eq('shopper_image_id', row.id)
    if (generationsError) throw generationsError
    const resultPaths = (generations || []).map((generation:any) => generation.output_storage_path).filter(Boolean)
    if (resultPaths.length) {
      const { error: resultDeleteError } = await service.storage.from('try-on-results').remove(resultPaths)
      if (resultDeleteError) throw resultDeleteError
    }
    const { error: sourceDeleteError } = await service.storage.from('shopper-images').remove([row.storage_path])
    if (sourceDeleteError) throw sourceDeleteError
    const { error: rowDeleteError } = await service.from('shopper_images').delete().eq('id', row.id)
    if (rowDeleteError) throw rowDeleteError
    return json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'AUTH_REQUIRED') return errorJson('Sign in to delete a try-on photo.', 401)
    if (message.startsWith('SESSION_')) return errorJson('Invalid shopper session.', 401, message)
    console.error(error)
    return errorJson('Shopper image delete failed.', 500, message)
  }
})
