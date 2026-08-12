<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import StoreHeader from '@/components/store/StoreHeader.vue'
import ProductCard from '@/components/store/ProductCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { getProducts, resolveMerchant, trackEvent } from '@/lib/api'
import { activateTenantScope, applyStorefrontTheme, customTenantHost, tenantSlugFromRoute } from '@/lib/tenant'
import { useShopperStore } from '@/stores/shopper'
import { useChatStore } from '@/stores/chat'
import { useTryOnStore } from '@/stores/tryOn'
import type { Merchant, Product } from '@/types'

const route = useRoute()
const shopper = useShopperStore()
const chat = useChatStore()
const tryOn = useTryOnStore()
const merchant = ref<Merchant | null>(null)
const products = ref<Product[]>([])
const category = ref('All')
const loading = ref(true)
const categories = computed(() => ['All', ...new Set(products.value.map((p) => p.category))])
const filtered = computed(() => category.value === 'All' ? products.value : products.value.filter((p) => p.category === category.value))
const cfg = computed(() => merchant.value?.storefront_config || {})

onMounted(async () => {
  shopper.ensureSession()
  merchant.value = await resolveMerchant(tenantSlugFromRoute(route.params.slug), customTenantHost())
  if (merchant.value) {
    if (activateTenantScope(merchant.value.id)) {
      chat.reset()
      tryOn.reset()
      await shopper.clearPhoto().catch(() => undefined)
      shopper.rotateSession()
    }
    applyStorefrontTheme(merchant.value)
    products.value = await getProducts(merchant.value.id)
    await trackEvent('store_view', { merchantId: merchant.value.id, sessionId: shopper.sessionId })
  }
  loading.value = false
})
</script>
<template>
  <div v-if="merchant" class="min-h-screen bg-[var(--store-background)] text-[var(--store-text)]">
    <StoreHeader :merchant="merchant" />
    <main class="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <section class="grid gap-7 py-10 sm:py-16 lg:grid-cols-[1fr_.72fr] lg:items-center">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[.2em] opacity-60">{{ merchant.name }}</p>
          <h1 class="mt-3 max-w-3xl text-4xl font-semibold tracking-[-.045em] sm:text-6xl">{{ cfg.heroTitle || 'Find the look. Then see yourself in it.' }}</h1>
          <p class="mt-5 max-w-2xl text-sm leading-6 opacity-65 sm:text-base">{{ cfg.heroCopy || merchant.description }}</p>
          <div class="mt-7 inline-flex rounded-full bg-[var(--store-accent)] px-4 py-2 text-xs font-semibold text-white">{{ cfg.tryOnLabel || 'Try-on available across the collection' }}</div>
        </div>
        <div v-if="cfg.heroImageUrl" class="overflow-hidden rounded-[1.8rem] bg-cream"><img :src="cfg.heroImageUrl" :alt="merchant.name" class="aspect-[4/3] h-full w-full object-cover" /></div>
      </section>
      <div class="hide-scrollbar mb-6 flex gap-2 overflow-x-auto">
        <button v-for="c in categories" :key="c" class="rounded-full border px-4 py-2 text-xs font-medium" :class="category===c?'border-transparent bg-[var(--store-accent)] text-white':'border-black/15 bg-transparent'" @click="category=c">{{ c }}</button>
      </div>
      <div v-if="loading" class="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"><div v-for="i in 8" :key="i" class="aspect-[4/5] animate-pulse rounded-[1.4rem] bg-cream"></div></div>
      <div v-else-if="filtered.length" class="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"><ProductCard v-for="p in filtered" :key="p.id" :product="p" :merchant="merchant" /></div>
      <div v-else class="rounded-[1.5rem] border border-black/10 bg-white p-8 text-center"><h2 class="font-semibold">No products here yet</h2><p class="mt-2 text-sm opacity-60">This store has not published products in this category.</p></div>
    </main>
  </div>
  <div v-else-if="loading" class="grid min-h-screen place-items-center p-8 text-sm text-muted">Loading store…</div>
  <div v-else-if="!loading" class="grid min-h-screen place-items-center p-8 text-center"><div><h1 class="text-2xl font-semibold">Store unavailable</h1><p class="mt-2 text-sm text-muted">Check the store link or contact the retailer.</p><AppButton class="mt-5" @click="$router.push('/')">Go to Mirror</AppButton></div></div>
</template>
