import { corsHeaders } from './cors.ts'

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

export function errorJson(message: string, status = 400, details?: unknown) {
  return json({ error: message, details }, status)
}
