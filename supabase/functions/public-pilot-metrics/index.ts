import { corsHeaders } from '../_shared/cors.ts'
import { errorJson } from '../_shared/http.ts'
import { serviceClient } from '../_shared/auth.ts'

const PILOT_MERCHANT_ID = Deno.env.get('PUBLIC_PILOT_MERCHANT_ID') || '11111111-1111-4111-8111-111111111111'

async function allEvents(service: any, since: string) {
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await service.from('analytics_events')
      .select('event_type,session_id,created_at')
      .eq('merchant_id', PILOT_MERCHANT_ID)
      .gte('created_at', since)
      .order('created_at', { ascending:true })
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return rows
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers:corsHeaders })
  if (req.method !== 'GET' && req.method !== 'POST') return errorJson('Method not allowed.', 405)
  try {
    const days = 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const service = serviceClient()
    const [{ data:merchant, error:merchantError }, products, events] = await Promise.all([
      service.from('merchants').select('id,name').eq('id', PILOT_MERCHANT_ID).maybeSingle(),
      service.from('products').select('*', { count:'exact', head:true }).eq('merchant_id', PILOT_MERCHANT_ID).eq('is_active', true),
      allEvents(service, since),
    ])
    if (merchantError) throw merchantError
    if (!merchant) return errorJson('Pilot retailer not found.', 404)
    if (products.error) throw products.error

    const sessions = (...types:string[]) => new Set(events.filter((event:any) => types.includes(event.event_type)).map((event:any) => event.session_id).filter(Boolean))
    const count = (...types:string[]) => events.filter((event:any) => types.includes(event.event_type)).length
    const productViews = sessions('product_view')
    const tryStarts = sessions('try_on_started', 'complete_look_started')
    const tryCompletes = sessions('try_on_completed', 'complete_look_completed')
    const checkouts = sessions('checkout_clicked')
    const intersect = (base:Set<string>, next:Set<string>) => new Set([...base].filter((id) => next.has(id)))
    const startedAfterView = intersect(productViews, tryStarts)
    const completedAfterStart = intersect(startedAfterView, tryCompletes)
    const checkoutAfterComplete = intersect(completedAfterStart, checkouts)
    const pct = (value:number, total:number) => total ? Math.round((value / total) * 100) : 0
    const allSessions = sessions('store_view','product_view','try_on_started','complete_look_started','chat_started','checkout_clicked')

    const payload = {
      merchantName:merchant.name,
      productCount:products.count || 0,
      shopperSessions:allSessions.size,
      tryOns:count('try_on_completed','complete_look_completed'),
      conversations:sessions('chat_started').size,
      checkoutClicks:count('checkout_clicked'),
      tryOnCompletionRate:pct(count('try_on_completed','complete_look_completed'), count('try_on_started','complete_look_started')),
      funnel:[
        { label:'Viewed a product', value:productViews.size, conversionFromPrevious:null },
        { label:'Started a try-on', value:startedAfterView.size, conversionFromPrevious:pct(startedAfterView.size, productViews.size) },
        { label:'Completed a try-on', value:completedAfterStart.size, conversionFromPrevious:pct(completedAfterStart.size, startedAfterView.size) },
        { label:'Clicked to checkout', value:checkoutAfterComplete.size, conversionFromPrevious:pct(checkoutAfterComplete.size, completedAfterStart.size) },
      ],
      period:{ days, since, until:new Date().toISOString() },
      generatedAt:new Date().toISOString(),
    }
    return new Response(JSON.stringify(payload), { headers:{ ...corsHeaders, 'Content-Type':'application/json', 'Cache-Control':'public, max-age=60, s-maxage=300' } })
  } catch (error) {
    console.error(error)
    return errorJson('Pilot metrics could not be loaded.', 500)
  }
})
