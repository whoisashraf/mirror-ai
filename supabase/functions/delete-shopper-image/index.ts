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
    const sessionId = String(body.sessionId || '')
    const imageId = String(body.imageId || '')
    if (!sessionId || !imageId) return errorJson('Missing delete parameters.')
    const session = await requireShopperSession(req, service, null, sessionId, user.id)
    const { data: row, error } = await service.from('shopper_images').select('id,storage_path,shopper_session_id').eq('id', imageId).eq('shopper_session_id', session.id).single()
    if (error || !row) return errorJson('Shopper image not found.', 404)
    const { data: generations } = await service.from('try_on_generations').select('output_storage_path').eq('shopper_image_id', row.id)
    const resultPaths = (generations || []).map((generation:any) => generation.output_storage_path).filter(Boolean)
    if (resultPaths.length) await service.storage.from('try-on-results').remove(resultPaths)
    await service.storage.from('shopper-images').remove([row.storage_path])
    await service.from('shopper_images').delete().eq('id', row.id)
    return json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'AUTH_REQUIRED') return errorJson('Sign in to delete a try-on photo.', 401)
    if (message.startsWith('SESSION_')) return errorJson('Invalid shopper session.', 401, message)
    console.error(error)
    return errorJson('Shopper image delete failed.', 500, message)
  }
})
