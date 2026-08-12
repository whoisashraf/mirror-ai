import { corsHeaders } from '../_shared/cors.ts'
import { errorJson, json } from '../_shared/http.ts'
import { requireUser, serviceClient } from '../_shared/auth.ts'

const intentLabels: Record<string,string> = {
  pairing:'Product pairing', occasion:'Occasion suitability', colour:'Colour compatibility', budget:'Budget outfits',
  modesty:'Modesty', casual:'Make it casual', formal:'Make it formal', other:'Other',
}

async function allEvents(service:any, merchantId:string, since:string) {
  const rows:any[]=[]
  for(let from=0;;from+=1000){
    const {data,error}=await service.from('analytics_events')
      .select('event_type,session_id,product_id,metadata,created_at')
      .eq('merchant_id',merchantId)
      .gte('created_at',since)
      .order('created_at',{ascending:true})
      .range(from,from+999)
    if(error) throw error
    rows.push(...(data || []))
    if(!data || data.length<1000) break
  }
  return rows
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST') return errorJson('Method not allowed.',405)
  const service=serviceClient()
  try{
    const user=await requireUser(req,service)
    const body=await req.json()
    const merchantId=String(body.merchantId||'')
    const requestedDays=Number(body.days||30)
    const days=[7,30,90].includes(requestedDays)?requestedDays:30
    const since=new Date(Date.now()-days*24*60*60*1000).toISOString()
    const {data:merchant}=await service.from('merchants').select('id,owner_user_id').eq('id',merchantId).maybeSingle()
    if(!merchant) return errorJson('Merchant not found.',404)
    if(merchant.owner_user_id!==user.id) return errorJson('You do not own this merchant.',403)

    const countProducts=service.from('products').select('*',{count:'exact',head:true}).eq('merchant_id',merchantId).eq('is_active',true)
    const [products,events]=await Promise.all([countProducts,allEvents(service,merchantId,since)])

    const eventCount=(...types:string[])=>events.filter((event:any)=>types.includes(event.event_type)).length
    const sessionSet=(...types:string[])=>new Set(events.filter((event:any)=>types.includes(event.event_type)).map((event:any)=>event.session_id).filter(Boolean))
    const allSessions=sessionSet('store_view','product_view','try_on_started','complete_look_started','chat_started','checkout_clicked')
    const productViewSessions=sessionSet('product_view')
    const tryStartSessions=sessionSet('try_on_started','complete_look_started')
    const tryCompleteSessions=sessionSet('try_on_completed','complete_look_completed')
    const checkoutSessions=sessionSet('checkout_clicked')
    const intersect=(base:Set<string>,next:Set<string>)=>new Set([...base].filter((id)=>next.has(id)))
    const startedAfterView=intersect(productViewSessions,tryStartSessions)
    const completedAfterStart=intersect(startedAfterView,tryCompleteSessions)
    const checkoutAfterComplete=intersect(completedAfterStart,checkoutSessions)
    const pct=(value:number,total:number)=>total?Math.round((value/total)*100):0

    const intentCounts=new Map<string,number>()
    const productCounts=new Map<string,{tryOns:number;recommendationClicks:number}>()
    for(const event of events){
      if(event.event_type==='chat_message_sent'){
        const key=String((event.metadata as any)?.intent || 'other')
        intentCounts.set(key,(intentCounts.get(key)||0)+1)
      }
      if(event.event_type==='try_on_completed' || event.event_type==='complete_look_completed'){
        const ids=Array.isArray((event.metadata as any)?.productIds) ? (event.metadata as any).productIds.map(String) : (event.product_id ? [event.product_id] : [])
        for(const productId of ids){
          const current=productCounts.get(productId) || {tryOns:0,recommendationClicks:0}
          current.tryOns += 1
          productCounts.set(productId,current)
        }
      }
      if(event.event_type==='recommendation_clicked' && event.product_id){
        const current=productCounts.get(event.product_id) || {tryOns:0,recommendationClicks:0}
        current.recommendationClicks += 1
        productCounts.set(event.product_id,current)
      }
    }

    const intentTotal=[...intentCounts.values()].reduce((a,b)=>a+b,0) || 1
    const shopperIntents=[...intentCounts.entries()]
      .sort((a,b)=>b[1]-a[1])
      .slice(0,6)
      .map(([key,count])=>({label:intentLabels[key] || key,count,share:Math.round((count/intentTotal)*100)}))

    const productIds=[...productCounts.keys()]
    let productNames=new Map<string,string>()
    if(productIds.length){
      const {data:productRows}=await service.from('products').select('id,name').eq('merchant_id',merchantId).in('id',productIds)
      productNames=new Map((productRows || []).map((product:any)=>[product.id,product.name]))
    }
    const topProducts=[...productCounts.entries()]
      .map(([productId,stats])=>({productId,name:productNames.get(productId)||'Product',...stats}))
      .sort((a,b)=>(b.tryOns+b.recommendationClicks)-(a.tryOns+a.recommendationClicks))
      .slice(0,5)

    const dailyMap=new Map<string,{sessions:Set<string>;tryOns:number;checkoutClicks:number}>()
    for(const event of events){
      const date=String(event.created_at).slice(0,10)
      const current=dailyMap.get(date)||{sessions:new Set<string>(),tryOns:0,checkoutClicks:0}
      if(event.session_id) current.sessions.add(event.session_id)
      if(event.event_type==='try_on_completed' || event.event_type==='complete_look_completed') current.tryOns+=1
      if(event.event_type==='checkout_clicked') current.checkoutClicks+=1
      dailyMap.set(date,current)
    }
    const dailyActivity=[]
    for(let offset=days-1;offset>=0;offset--){
      const date=new Date(Date.now()-offset*24*60*60*1000).toISOString().slice(0,10)
      const current=dailyMap.get(date)
      dailyActivity.push({date,sessions:current?.sessions.size||0,tryOns:current?.tryOns||0,checkoutClicks:current?.checkoutClicks||0})
    }

    const recommendationShown=eventCount('recommendation_shown')
    const recommendationClicks=eventCount('recommendation_clicked')
    const completedLooks=eventCount('try_on_completed','complete_look_completed')
    const startedLooks=eventCount('try_on_started','complete_look_started')

    const result={
      productCount:products.count||0,
      shopperSessions:allSessions.size,
      tryOns:completedLooks,
      conversations:sessionSet('chat_started').size,
      recommendationShown,
      recommendationClicks,
      checkoutClicks:eventCount('checkout_clicked'),
      tryOnCompletionRate:pct(completedLooks,startedLooks),
      recommendationClickRate:pct(recommendationClicks,recommendationShown),
      checkoutRate:pct(checkoutAfterComplete.size,completedAfterStart.size),
      funnel:[
        {label:'Viewed a product',value:productViewSessions.size,conversionFromPrevious:null},
        {label:'Started a try-on',value:startedAfterView.size,conversionFromPrevious:pct(startedAfterView.size,productViewSessions.size)},
        {label:'Completed a try-on',value:completedAfterStart.size,conversionFromPrevious:pct(completedAfterStart.size,startedAfterView.size)},
        {label:'Clicked to checkout',value:checkoutAfterComplete.size,conversionFromPrevious:pct(checkoutAfterComplete.size,completedAfterStart.size)},
      ],
      shopperIntents,
      topProducts,
      dailyActivity,
      period:{days,since,until:new Date().toISOString()},
      generatedAt:new Date().toISOString(),
    }
    return json(result)
  }catch(error){
    const message=error instanceof Error?error.message:String(error)
    if(message==='AUTH_REQUIRED') return errorJson('Authentication required.',401)
    console.error(error)
    return errorJson('Analytics could not be loaded.',500,message)
  }
})
