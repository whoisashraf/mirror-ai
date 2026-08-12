<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StoreHeader from '@/components/store/StoreHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { formatMoney } from '@/lib/format'
import { getProduct, resolveMerchant, trackEvent } from '@/lib/api'
import { activateTenantScope, applyStorefrontTheme, customTenantHost, storefrontPath, tenantSlugFromRoute } from '@/lib/tenant'
import { useShopperStore } from '@/stores/shopper'
import { useTryOnStore } from '@/stores/tryOn'
import { useChatStore } from '@/stores/chat'
import { initializeAuth } from '@/lib/auth'
import type { Merchant, Product, StylePreference } from '@/types'

const route = useRoute(), router = useRouter(), shopper = useShopperStore(), tryOn = useTryOnStore(), chat = useChatStore()
const merchant = ref<Merchant | null>(null), product = ref<Product | null>(null), starting = ref(false)
const loading = ref(true)
const showPreference = ref(false)
const preferenceError = ref('')
const tryOnLabel = computed(() => merchant.value?.storefront_config?.tryOnLabel || 'Try it on')
const photoSettingsPath = computed(() => merchant.value ? storefrontPath(merchant.value, '/settings/photo') : '/')
const returnTo = computed(() => {
  const requested = typeof route.query.return === 'string' ? route.query.return : ''
  if (requested.startsWith('/') && !requested.startsWith('//') && requested.includes('/try-on/')) return requested
  return merchant.value ? storefrontPath(merchant.value, '/') : '/'
})
const returnLabel = computed(() => returnTo.value.includes('/try-on/') ? 'Back to your look' : 'Back to store')

onMounted(async () => {
  try {
    shopper.ensureSession()
    merchant.value = await resolveMerchant(tenantSlugFromRoute(route.params.slug), customTenantHost())
    product.value = await getProduct(route.params.productId as string)
    if (merchant.value) {
      if (activateTenantScope(merchant.value.id)) { chat.reset(); tryOn.reset(); await shopper.clearPhoto().catch(() => undefined); shopper.rotateSession() }
      applyStorefrontTheme(merchant.value)
      if (await initializeAuth()) await shopper.restoreBasePhoto(merchant.value.id)
    }
    if (merchant.value && product.value && product.value.merchant_id === merchant.value.id) {
      await trackEvent('product_view', { merchantId:merchant.value.id, sessionId:shopper.sessionId, productId:product.value.id })
    } else if (product.value && merchant.value && product.value.merchant_id !== merchant.value.id) product.value = null
  } finally {
    loading.value = false
  }
})

async function start() {
  if (!merchant.value || !product.value) return
  if (!await initializeAuth()) {
    await router.push({ path:'/auth', query:{ redirect:route.fullPath } })
    return
  }
  if (!shopper.stylePreference) { showPreference.value = true; preferenceError.value = 'Choose a collection to continue.'; return }
  const audience = product.value.style_audience || 'unisex'
  if (shopper.stylePreference !== 'any' && audience !== 'unisex' && audience !== shopper.stylePreference) { showPreference.value = true; preferenceError.value = `This item is in the ${audience} collection. Change your preference or choose a matching item.`; return }
  if (!shopper.imageUrl) {
    await goToPhotoSettings()
    return
  }
  starting.value = true
  try {
    const pending = tryOn.start({ merchantId:merchant.value.id, sessionId:shopper.sessionId, shopperImageId:shopper.imageId||undefined, shopperImageUrl:shopper.imageUrl, productIds:[product.value.id], mode:'single', stylePreference:shopper.stylePreference })
    const localId = tryOn.current?.id ?? crypto.randomUUID()
    await router.push({ path:storefrontPath(merchant.value, `/try-on/${localId}`), query:{ product:product.value.id } })
    void pending.catch(console.error)
  } finally { starting.value = false }
}
async function choosePreference(value: StylePreference) { shopper.setStylePreference(value); preferenceError.value = ''; showPreference.value = false; await start() }
async function goToPhotoSettings() {
  await router.push({ path:photoSettingsPath.value, query:{ return:route.fullPath } })
}
async function buyNow() {
  if (!merchant.value || !product.value) return
  await trackEvent('checkout_clicked', { merchantId:merchant.value.id, sessionId:shopper.sessionId, productId:product.value.id, metadata:{source:'product_detail'} })
  window.open(product.value.product_url, '_blank', 'noopener,noreferrer')
}
</script>
<template>
  <div v-if="merchant&&product&&showPreference" class="fixed inset-0 z-50 grid place-items-end bg-black/30 p-3 sm:place-items-center" @click.self="showPreference=false"><section role="dialog" aria-modal="true" aria-labelledby="collection-title" class="w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-xl"><div class="flex items-start justify-between gap-3"><div><p id="collection-title" class="text-base font-semibold">Which collection should the stylist use?</p><p class="mt-1 text-xs leading-5 text-muted">This controls product matching—it does not label your identity.</p></div><button class="focus-ring grid h-10 w-10 place-items-center rounded-full bg-paper" aria-label="Close collection picker" @click="showPreference=false">×</button></div><div class="mt-4 grid grid-cols-3 gap-2"><button v-for="option in (['menswear','womenswear','any'] as StylePreference[])" :key="option" class="min-h-11 rounded-full border px-3 py-2 text-xs font-semibold capitalize" :class="shopper.stylePreference===option?'border-ink bg-ink text-white':'border-line'" @click="choosePreference(option)">{{ option }}</button></div><p v-if="preferenceError" role="alert" class="mt-3 text-xs text-red-700">{{ preferenceError }}</p></section></div>
  <div v-if="merchant&&product" class="min-h-screen bg-[var(--store-background)] text-[var(--store-text)]"><StoreHeader :merchant="merchant"/><main class="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 sm:pt-8"><button class="focus-ring mb-5 min-h-10 rounded-full px-2 text-sm font-medium" @click="router.push(returnTo)">← {{returnLabel}}</button><div class="grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14"><div class="overflow-hidden rounded-[1.6rem] bg-cream"><img :src="product.primary_image_url" :alt="product.name" class="aspect-[4/5] w-full object-cover"/></div><div class="lg:sticky lg:top-24 lg:self-start"><p class="text-xs font-semibold uppercase tracking-[.18em] opacity-60">{{ product.category }}</p><h1 class="mt-2 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">{{ product.name }}</h1><p class="mt-3 text-lg font-medium">{{ formatMoney(product.price,product.currency) }}</p><p class="mt-5 text-sm leading-7 opacity-65">{{ product.description }}</p><div class="mt-5 grid gap-3"><div v-if="product.colours?.length"><p class="mb-2 text-[10px] font-semibold uppercase tracking-[.16em] opacity-55">Colours</p><div class="flex flex-wrap gap-2"><span v-for="c in product.colours" :key="c" class="rounded-full border border-black/15 px-3 py-1.5 text-xs">{{ c }}</span></div></div><div v-if="product.sizes?.length"><p class="mb-2 text-[10px] font-semibold uppercase tracking-[.16em] opacity-55">Available sizes</p><div class="flex flex-wrap gap-2"><span v-for="s in product.sizes" :key="s" class="rounded-full bg-cream px-3 py-1.5 text-xs">{{ s }}</span></div></div></div><div class="mt-8 grid gap-2"><AppButton class="w-full" :disabled="starting || shopper.restoringPhoto" @click="start">{{ shopper.restoringPhoto?'Restoring your photo…':starting?'Starting…':tryOnLabel }}</AppButton><AppButton variant="outline" class="w-full" @click="buyNow">Buy from {{merchant.name}} ↗</AppButton><button v-if="!shopper.imageUrl && !shopper.restoringPhoto" type="button" class="focus-ring min-h-11 text-xs font-semibold underline" @click="goToPhotoSettings">Set up my try-on photo</button></div><p v-if="shopper.imageUrl" class="mt-3 text-xs font-medium opacity-65">Your base photo is ready and will be used automatically. You can change it from Photo settings in your account menu.</p><p class="mt-4 text-xs leading-5 opacity-60">Virtual try-on is a visual approximation. It does not guarantee size, fit or how fabric will behave in person.</p></div></div></main></div>
  <div v-else-if="loading" class="grid min-h-screen place-items-center p-8 text-sm text-muted">Loading product…</div>
  <div v-else class="grid min-h-screen place-items-center p-8 text-center"><div><h1 class="text-2xl font-semibold">Product unavailable</h1><p class="mt-2 text-sm text-muted">This product is not available in this store.</p><AppButton class="mt-5" @click="router.push(merchant ? storefrontPath(merchant, '/') : '/')">{{ merchant ? 'Browse the store' : 'Go to Mirror' }}</AppButton></div></div>
</template>
