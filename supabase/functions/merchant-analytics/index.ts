import { corsHeaders } from '../_shared/cors.ts'
import { errorJson, json } from '../_shared/http.ts'
import { requireUser, serviceClient } from '../_shared/auth.ts'

const intentLabels: Record<string,string> = {
  pairing:'Product pairing', occasion:'Occasion suitability', colour:'Colour compatibility', budget:'Budget outfits',
  modesty:'Modesty', casual:'Make it casual', formal:'Make it formal', other:'Other',
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST') return errorJson('Method not allowed.',405)
  const service=serviceClient()
  try{
    const user=await requireUser(req,service)
    const body=await req.json()
    const merchantId=String(body.merchantId||'')
    const {data:merchant}=await service.from('merchants').select('id,owner_user_id').eq('id',merchantId).maybeSingle()
    if(!merchant) return errorJson('Merchant not found.',404)
    if(merchant.owner_user_id!==user.id) return errorJson('You do not own this merchant.',403)

    const countProducts=service.from('products').select('*',{count:'exact',head:true}).eq('merchant_id',merchantId).eq('is_active',true)
    const countEvent=(event:string)=>service.from('analytics_events').select('*',{count:'exact',head:true}).eq('merchant_id',merchantId).eq('event_type',event)
    const [products,views,starts,completed,chats,recs,checkouts]=await Promise.all([
      countProducts,countEvent('product_view'),countEvent('try_on_started'),countEvent('try_on_completed'),
      countEvent('chat_started'),countEvent('recommendation_clicked'),countEvent('checkout_clicked'),
    ])

    const {data:events}=await service.from('analytics_events')
      .select('event_type,product_id,metadata')
      .eq('merchant_id',merchantId)
      .in('event_type',['chat_message_sent','try_on_completed','recommendation_clicked'])
      .order('created_at',{ascending:false})
      .limit(2000)

    const intentCounts=new Map<string,number>()
    const productCounts=new Map<string,{tryOns:number;recommendationClicks:number}>()
    for(const event of events || []){
      if(event.event_type==='chat_message_sent'){
        const key=String((event.metadata as any)?.intent || 'other')
        intentCounts.set(key,(intentCounts.get(key)||0)+1)
      }
      if(event.event_type==='try_on_completed'){
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

    const result={
      productCount:products.count||0,
      tryOns:completed.count||0,
      conversations:chats.count||0,
      recommendationClicks:recs.count||0,
      checkoutClicks:checkouts.count||0,
      funnel:[
        {label:'Product views',value:views.count||0},
        {label:'Try-ons started',value:starts.count||0},
        {label:'Try-ons completed',value:completed.count||0},
        {label:'Mirror conversations',value:chats.count||0},
        {label:'Recommendation clicks',value:recs.count||0},
        {label:'Checkout clicks',value:checkouts.count||0},
      ],
      shopperIntents,
      topProducts,
    }
    return json(result)
  }catch(error){
    const message=error instanceof Error?error.message:String(error)
    if(message==='AUTH_REQUIRED') return errorJson('Authentication required.',401)
    console.error(error)
    return errorJson('Analytics could not be loaded.',500,message)
  }
})
