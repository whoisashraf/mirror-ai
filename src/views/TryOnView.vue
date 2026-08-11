<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GenerationProgress from '@/components/tryon/GenerationProgress.vue'
import CurrentLookBar from '@/components/tryon/CurrentLookBar.vue'
import ShopThisLook from '@/components/tryon/ShopThisLook.vue'
import MirrorChat from '@/components/chat/MirrorChat.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { getProduct, resolveMerchant, trackEvent } from '@/lib/api'
import { activateTenantScope, applyStorefrontTheme, customTenantHost, storefrontPath, tenantSlugFromRoute } from '@/lib/tenant'
import { useShopperStore } from '@/stores/shopper'
import { useTryOnStore } from '@/stores/tryOn'
import { useChatStore } from '@/stores/chat'
import { isLookSaved, saveLook as persistLook } from '@/lib/savedLooks'
import type { Merchant, Product, TryOnCategory } from '@/types'

const route = useRoute()
const router = useRouter()
const shopper = useShopperStore()
const tryOn = useTryOnStore()
const chat = useChatStore()
const merchant = ref<Merchant | null>(null)
const product = ref<Product | null>(null)
const lookProducts = ref<Product[]>([])
const error = ref('')
const saved = ref(false)
const showShop = ref(false)
const status = computed(() => tryOn.current?.status ?? 'idle')
const busy = computed(() => ['preparing','generating','finalizing'].includes(status.value))
const result = computed(() => tryOn.current?.output_image_url || shopper.imageUrl)
const assistantName = computed(() => merchant.value?.storefront_config?.assistantName || 'Mirror')
const currentProductIds = computed(() => tryOn.current?.productIds || (product.value ? [product.value.id] : []))
const history = computed(() => tryOn.history)
const exclusiveCategories = new Set<TryOnCategory>(['top','outerwear','dress','bottom','shoes','bag','headwear','earrings','necklace'])
let loadToken = 0

watch([currentProductIds, () => merchant.value?.id], async ([ids]) => {
  const token = ++loadToken
  const loaded = (await Promise.all(ids.map((id) => getProduct(id)))).filter(Boolean) as Product[]
  if (token === loadToken) lookProducts.value = loaded.filter((p) => p.merchant_id === merchant.value?.id)
}, { immediate:true })

watch(() => tryOn.current?.id, (id) => {
  saved.value = Boolean(id && isLookSaved(id))
})

onMounted(async () => {
  shopper.ensureSession()
  merchant.value = await resolveMerchant(tenantSlugFromRoute(route.params.slug), customTenantHost())
  const pid = route.query.product as string
  if (pid) product.value = await getProduct(pid)
  if (merchant.value) {
    if (activateTenantScope(merchant.value.id)) { chat.reset(); tryOn.reset(); await shopper.clearPhoto().catch(() => undefined); shopper.rotateSession() }
    applyStorefrontTheme(merchant.value)
  }
  if (!tryOn.current && !shopper.imageUrl) error.value = 'This try-on photo is no longer available in this browser session.'
  if (!tryOn.current && product.value && merchant.value && shopper.imageUrl) {
    try {
      await tryOn.start({ merchantId:merchant.value.id, sessionId:shopper.sessionId, shopperImageId:shopper.imageId||undefined, shopperImageUrl:shopper.imageUrl, productIds:[product.value.id], mode:'single', stylePreference:shopper.stylePreference || 'any' })
    } catch (e) { error.value = e instanceof Error ? e.message : String(e) }
  }
})
onBeforeUnmount(() => tryOn.stopPolling())

async function generate(ids: string[], mode: 'single' | 'complete_look' = 'complete_look') {
  if (!merchant.value || !shopper.imageUrl || !ids.length || busy.value) return
  error.value = ''
  const parent = tryOn.current?.status === 'completed' ? tryOn.current.id : undefined
  try {
    await tryOn.start({
      merchantId:merchant.value.id,
      sessionId:shopper.sessionId,
      shopperImageId:shopper.imageId || undefined,
      shopperImageUrl:shopper.imageUrl,
      productIds:[...new Set(ids)].slice(0, 5),
      mode,
      parentGenerationId:parent,
      stylePreference:shopper.stylePreference || 'any',
    })
  } catch (e) { error.value = e instanceof Error ? e.message : String(e) }
}

async function completeLook(ids:string[]) {
  await generate([...currentProductIds.value, ...ids], 'complete_look')
}

function normalizedIdsForAdd(candidate: Product, targetProductId?: string) {
  let products = [...lookProducts.value]
  if (targetProductId) products = products.filter((p) => p.id !== targetProductId)

  const category = candidate.try_on_category
  if (category === 'dress') products = products.filter((p) => !['dress','top','bottom'].includes(p.try_on_category || ''))
  if (category === 'top' || category === 'bottom') products = products.filter((p) => p.try_on_category !== 'dress')
  if (category && exclusiveCategories.has(category)) products = products.filter((p) => p.try_on_category !== category)
  products.push(candidate)
  return [...new Set(products.map((p) => p.id))]
}

async function addToLook(productId: string) {
  if (currentProductIds.value.includes(productId)) return
  const candidate = await getProduct(productId)
  if (!candidate || candidate.merchant_id !== merchant.value?.id) return
  await generate(normalizedIdsForAdd(candidate), 'complete_look')
}

async function replaceInLook(productId: string, targetProductId?: string) {
  const candidate = await getProduct(productId)
  if (!candidate || candidate.merchant_id !== merchant.value?.id) return
  await generate(normalizedIdsForAdd(candidate, targetProductId), 'complete_look')
}

async function removeFromLook(productId: string) {
  if (currentProductIds.value.length <= 1) return
  await generate(currentProductIds.value.filter((id) => id !== productId), 'complete_look')
}

async function regenerate() {
  if (!currentProductIds.value.length) return
  await generate(currentProductIds.value, tryOn.current?.mode || 'single')
}

function saveLook() {
  if (!tryOn.current) return
  persistLook(tryOn.current, currentProductIds.value)
  saved.value = true
}

async function buyProduct(item: Product) {
  if (!merchant.value) return
  await trackEvent('checkout_clicked', { merchantId:merchant.value.id, sessionId:shopper.sessionId, productId:item.id, generationId:tryOn.current?.id, metadata:{currentLookProductIds:currentProductIds.value} })
  window.open(item.product_url, '_blank', 'noopener,noreferrer')
}
</script>
<template>
  <main class="h-dvh overflow-hidden bg-[var(--store-background)] text-[var(--store-text)]">
    <header class="h-16 border-b border-black/10 bg-[var(--store-background)]">
      <div class="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6"><button class="focus-ring min-h-11 rounded-full px-2 text-sm font-medium" @click="router.back()">← Back</button><span class="font-semibold">{{ merchant?.name || 'Store' }}</span><span class="text-xs opacity-55">{{ assistantName }}</span></div>
    </header>

    <div class="mx-auto grid h-[calc(100dvh-4rem)] max-w-7xl grid-rows-[42dvh_minmax(0,1fr)] gap-3 overflow-hidden px-3 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,.95fr)] lg:grid-rows-1 lg:gap-5 lg:px-6 lg:py-5">
      <section class="min-h-0">
        <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-line bg-white">
          <div class="flex min-h-12 shrink-0 items-center justify-between border-b border-line px-3 sm:px-4">
            <div><p class="text-[9px] font-semibold uppercase tracking-[.18em] text-muted">Live fitting room</p><p class="mt-0.5 max-w-44 truncate text-xs font-semibold sm:max-w-sm">{{ lookProducts.map((p)=>p.name).join(' + ') || product?.name || 'Your outfit' }}</p></div>
            <div class="flex items-center gap-1">
              <button v-if="status==='completed'" class="focus-ring min-h-10 rounded-full px-3 text-[10px] font-semibold hover:bg-paper" @click="saveLook">{{ saved?'Saved ✓':'Save' }}</button>
              <button v-if="status==='completed'" class="focus-ring min-h-10 rounded-full px-3 text-[10px] font-semibold hover:bg-paper" :disabled="busy" @click="regenerate">Regenerate</button>
              <button v-if="status==='completed' && lookProducts.length" class="focus-ring min-h-10 rounded-full bg-[var(--store-accent)] px-3 text-[10px] font-semibold text-white" @click="showShop=true">Shop look</button>
            </div>
          </div>

          <div class="relative flex min-h-0 flex-1 items-center justify-center bg-cream">
            <div v-if="error && !tryOn.current" class="m-5 rounded-[1.5rem] border border-red-200 bg-white p-5"><h2 class="font-semibold">Try-on unavailable</h2><p class="mt-2 text-sm text-muted">{{error}}</p><AppButton v-if="merchant" class="mt-4" @click="router.push(storefrontPath(merchant,'/'))">Choose a product</AppButton></div>
            <GenerationProgress v-else-if="status!=='completed'&&status!=='failed'" :status="status" :product-count="currentProductIds.length" />
            <img v-else-if="status==='completed' && result" :src="result" alt="Current virtual try-on look" class="h-full w-full object-contain"/>
            <div v-else class="m-5 rounded-[1.5rem] border border-red-200 bg-white p-5"><h2 class="font-semibold">Generation didn’t complete</h2><p class="mt-2 text-sm text-muted">{{ tryOn.current?.error || error || 'Please try again.' }}</p><AppButton class="mt-4" @click="regenerate">Retry</AppButton></div>

            <div v-if="status==='completed'" class="absolute left-2 top-2 flex flex-wrap gap-1.5">
              <span class="rounded-full bg-white/92 px-2.5 py-1 text-[9px] font-semibold shadow-sm">{{ tryOn.current?.provider==='demo-fallback' ? 'Demo fallback preview' : 'AI visual preview' }}</span>
              <span v-if="tryOn.current?.fidelity_report" class="rounded-full bg-white/92 px-2.5 py-1 text-[9px] font-semibold shadow-sm">Fidelity {{ Math.round((tryOn.current.fidelity_report.overall || 0) * 100) }}%</span>
            </div>

            <div v-if="history.length > 1 && status==='completed'" class="absolute bottom-2 left-2 right-2 flex items-center gap-2 rounded-[1rem] bg-white/92 p-2 shadow-sm backdrop-blur">
              <span class="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted">Looks</span>
              <div class="hide-scrollbar flex min-w-0 gap-1.5 overflow-x-auto">
                <button v-for="(look,index) in history" :key="look.id" class="focus-ring h-10 w-9 shrink-0 overflow-hidden rounded-lg border-2" :class="look.id===tryOn.current?.id?'border-[var(--store-accent)]':'border-transparent'" :aria-label="`Open look ${index+1}`" @click="tryOn.selectHistory(look.id)"><img :src="look.output_image_url || shopper.imageUrl" alt="" class="h-full w-full object-cover" /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-line bg-white">
        <CurrentLookBar :products="lookProducts" :busy="busy" @remove="removeFromLook" />
        <div class="min-h-0 flex-1">
          <MirrorChat
            v-if="merchant"
            :merchant-id="merchant.id"
            :slug="merchant.slug"
            :product-id="currentProductIds[0]"
            :generation-id="tryOn.current?.id"
            :assistant-name="assistantName"
            :current-product-ids="currentProductIds"
            @try-complete-look="completeLook"
            @add-to-look="addToLook"
            @remove-from-look="removeFromLook"
            @replace-in-look="replaceInLook"
            @shop-look="showShop=true"
          />
        </div>
      </section>
    </div>

    <div v-if="showShop" class="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-3 sm:items-center" @click.self="showShop=false">
      <div class="max-h-[82dvh] w-full max-w-lg overflow-y-auto rounded-[1.6rem] bg-paper p-3 shadow-2xl">
        <div class="mb-2 flex items-center justify-between px-2 py-1"><p class="text-xs font-semibold">Your current look</p><button class="focus-ring grid h-10 w-10 place-items-center rounded-full bg-white" @click="showShop=false">×</button></div>
        <ShopThisLook :products="lookProducts" @buy="buyProduct" />
      </div>
    </div>
  </main>
</template>
