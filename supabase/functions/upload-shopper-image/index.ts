import { corsHeaders } from '../_shared/cors.ts'
import { errorJson, json } from '../_shared/http.ts'
import { requireUser, serviceClient } from '../_shared/auth.ts'
import { requireShopperSession } from '../_shared/session.ts'

const decodeBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorJson('Method not allowed.', 405)
  const service = serviceClient()

  try {
    const user = await requireUser(req, service)
    const body = await req.json()
    const merchantId = String(body.merchantId || '')
    const sessionId = String(body.sessionId || '')
    const contentType = String(body.contentType || 'image/jpeg')
    const consentAt = String(body.consentAt || new Date().toISOString())
    const base64Data = String(body.base64Data || '')
    const fileName = String(body.fileName || 'shopper.jpg')

    if (!merchantId || !sessionId || !base64Data) return errorJson('Missing upload parameters.')
    const session = await requireShopperSession(req, service, merchantId, sessionId, user.id)
    const ext = (fileName.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${merchantId}/${sessionId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await service.storage.from('shopper-images').upload(path, decodeBase64(base64Data), { contentType, upsert: false })
    if (uploadError) throw uploadError

    const { data: row, error: rowError } = await service.from('shopper_images').insert({ session_id: sessionId, shopper_session_id: session.id, storage_path: path, consent_at: consentAt }).select('id,storage_path').single()
    if (rowError) throw rowError

    const { data: signed, error: signedError } = await service.storage.from('shopper-images').createSignedUrl(path, 60 * 30)
    if (signedError) throw signedError

    return json({ image: { id: row.id, storagePath: row.storage_path, signedUrl: signed.signedUrl } })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'AUTH_REQUIRED') return errorJson('Sign in to upload a try-on photo.', 401)
    if (message.startsWith('SESSION_')) return errorJson('Invalid shopper session.', 401, message)
    console.error(error)
    return errorJson('Shopper image upload failed.', 500, message)
  }
})
