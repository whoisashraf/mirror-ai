<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StoreHeader from '@/components/store/StoreHeader.vue'
import PhotoUploader from '@/components/tryon/PhotoUploader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { formatMoney } from '@/lib/format'
import { getProduct, resolveMerchant, trackEvent } from '@/lib/api'
import { activateTenantScope, applyStorefrontTheme, customTenantHost, storefrontPath, tenantSlugFromRoute } from '@/lib/tenant'
import { useShopperStore } from '@/stores/shopper'
import { useTryOnStore } from '@/stores/tryOn'
import { useChatStore } from '@/stores/chat'
import { initializeAuth } from '@/lib/auth'
import type { Merchant, Product } from '@/types'

const route = useRoute(), router = useRouter(), shopper = useShopperStore(), tryOn = useTryOnStore(), chat = useChatStore()
const merchant = ref<Merchant | null>(null), product = ref<Product | null>(null), showPhoto = ref(false), starting = ref(false)
const tryOnLabel = computed(() => merchant.value?.storefront_config?.tryOnLabel || 'Try it on')

onMounted(async () => {
  shopper.ensureSession()
  merchant.value = await resolveMerchant(tenantSlugFromRoute(route.params.slug), customTenantHost())
  product.value = await getProduct(route.params.productId as string)
  if (merchant.value) {
    if (activateTenantScope(merchant.value.id)) { chat.reset(); tryOn.reset(); await shopper.clearPhoto().catch(() => undefined); shopper.rotateSession() }
    applyStorefrontTheme(merchant.value)
  }
  if (merchant.value && product.value && product.value.merchant_id === merchant.value.id) {
    await trackEvent('product_view', { merchantId:merchant.value.id, sessionId:shopper.sessionId, productId:product.value.id })
  } else if (product.value && merchant.value && product.value.merchant_id !== merchant.value.id) product.value = null
})

async function start() {
  if (!merchant.value || !product.value) return
  if (!await initializeAuth()) {
    await router.push({ path:'/auth', query:{ redirect:route.fullPath } })
    return
  }
  if (!shopper.imageUrl) { showPhoto.value = true; return }
  starting.value = true
  try {
    const pending = tryOn.start({ merchantId:merchant.value.id, sessionId:shopper.sessionId, shopperImageId:shopper.imageId||undefined, shopperImageUrl:shopper.imageUrl, productIds:[product.value.id], mode:'single' })
    const localId = tryOn.current?.id ?? crypto.randomUUID()
    await router.push({ path:storefrontPath(merchant.value, `/try-on/${localId}`), query:{ product:product.value.id } })
    void pending.catch(console.error)
  } finally { starting.value = false }
}
</script>
<template>
  <div v-if="merchant&&product" class="min-h-screen bg-[var(--store-background)] text-[var(--store-text)]"><StoreHeader :merchant="merchant"/><main class="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 sm:pt-10"><div class="grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14"><div class="overflow-hidden rounded-[1.6rem] bg-cream"><img :src="product.primary_image_url" :alt="product.name" class="aspect-[4/5] w-full object-cover"/></div><div class="lg:sticky lg:top-24 lg:self-start"><p class="text-xs font-semibold uppercase tracking-[.18em] opacity-60">{{ product.category }}</p><h1 class="mt-2 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">{{ product.name }}</h1><p class="mt-3 text-lg font-medium">{{ formatMoney(product.price,product.currency) }}</p><p class="mt-5 text-sm leading-7 opacity-65">{{ product.description }}</p><div class="mt-5 flex flex-wrap gap-2"><span v-for="c in product.colours" :key="c" class="rounded-full border border-black/15 px-3 py-1.5 text-xs">{{ c }}</span><span v-for="s in product.sizes" :key="s" class="rounded-full bg-cream px-3 py-1.5 text-xs">{{ s }}</span></div><div class="mt-8 grid gap-2"><AppButton class="w-full" :disabled="starting" @click="start">{{ starting?'Starting…':tryOnLabel }}</AppButton><AppButton variant="outline" class="w-full" @click="showPhoto=true">Ask {{ merchant.storefront_config?.assistantName || 'Mirror' }} with my photo</AppButton></div><p class="mt-4 text-xs leading-5 opacity-60">Virtual try-on is a visual approximation. It does not guarantee size, fit or how fabric will behave in person.</p></div></div><div v-if="showPhoto" class="mx-auto mt-10 max-w-xl"><PhotoUploader :merchant-id="merchant.id" :product-id="product.id" :try-on-category="product.try_on_category"/><AppButton v-if="shopper.imageUrl" class="mt-3 w-full" @click="start">Continue to try-on</AppButton></div></main></div>
  <div v-else class="grid min-h-screen place-items-center p-8 text-center"><div><h1 class="text-2xl font-semibold">Product unavailable</h1><p class="mt-2 text-sm text-muted">This product is not available in this store.</p></div></div>
</template>
