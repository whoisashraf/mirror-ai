import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing Supabase service configuration.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function requireUser(req: Request, service: SupabaseClient): Promise<User> {
  const header = req.headers.get('Authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('AUTH_REQUIRED')
  const { data, error } = await service.auth.getUser(token)
  if (error || !data.user) throw new Error('AUTH_REQUIRED')
  return data.user
}
