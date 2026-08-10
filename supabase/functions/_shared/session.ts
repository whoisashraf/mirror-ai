import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function requireShopperSession(req: Request, service: SupabaseClient, merchantId: string | null, sessionId: string) {
  const token = (req.headers.get('x-mirror-session-token') || '').trim()
  if (!token) throw new Error('SESSION_REQUIRED')
  const tokenHash = await sha256(token)
  const { data: existing, error } = await service.from('shopper_sessions').select('*').eq('session_id', sessionId).maybeSingle()
  if (error) throw error

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()

  if (!existing) {
    if (!merchantId) throw new Error('SESSION_REQUIRED')
    const { data: created, error: createError } = await service.from('shopper_sessions').insert({ merchant_id: merchantId, session_id: sessionId, session_token_hash: tokenHash, expires_at: expiresAt, last_seen_at: new Date().toISOString() }).select('*').single()
    if (createError) throw createError
    return created
  }

  if (merchantId && existing.merchant_id !== merchantId) throw new Error('SESSION_MERCHANT_MISMATCH')
  if (existing.session_token_hash !== tokenHash) throw new Error('SESSION_INVALID')
  if (existing.expires_at && new Date(existing.expires_at).getTime() < Date.now()) throw new Error('SESSION_EXPIRED')

  await service.from('shopper_sessions').update({ last_seen_at: new Date().toISOString(), expires_at: expiresAt }).eq('id', existing.id)
  return existing
}
