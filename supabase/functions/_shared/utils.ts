import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

export function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function enforceRateLimit(service: SupabaseClient, bucket: string, rawKey: string, limit: number, windowMs: number) {
  const keyHash = await sha256(rawKey)
  const since = new Date(Date.now() - windowMs).toISOString()
  const { count, error } = await service.from('rate_limit_events').select('*', { count: 'exact', head: true }).eq('bucket', bucket).eq('key_hash', keyHash).gte('created_at', since)
  if (error) throw error
  if ((count ?? 0) >= limit) throw new Error(`RATE_LIMIT:${bucket}`)
  const { error: insertError } = await service.from('rate_limit_events').insert({ bucket, key_hash: keyHash })
  if (insertError) throw insertError
}

export function cleanIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown').split(',')[0].trim()
}
