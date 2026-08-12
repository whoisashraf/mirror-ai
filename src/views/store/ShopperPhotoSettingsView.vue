<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import StoreHeader from '@/components/store/StoreHeader.vue'
import PhotoUploader from '@/components/tryon/PhotoUploader.vue'
import { resolveMerchant } from '@/lib/api'
import { activateTenantScope, applyStorefrontTheme, customTenantHost, tenantSlugFromRoute } from '@/lib/tenant'
import { useChatStore } from '@/stores/chat'
import { useShopperStore } from '@/stores/shopper'
import { useTryOnStore } from '@/stores/tryOn'
import type { Merchant } from '@/types'

const route = useRoute()
const shopper = useShopperStore()
const chat = useChatStore()
const tryOn = useTryOnStore()
const merchant = ref<Merchant | null>(null)
const loading = ref(true)

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
    await shopper.restoreBasePhoto(merchant.value.id)
  }
  loading.value = false
})
</script>

<template>
  <div v-if="merchant" class="min-h-screen bg-[var(--store-background)] text-[var(--store-text)]">
    <StoreHeader :merchant="merchant" />
    <main class="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <p class="text-xs font-semibold uppercase tracking-[.18em] opacity-55">Shopper settings</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">Your base photo</h1>
      <p class="mt-2 max-w-xl text-sm leading-6 opacity-65">Mirror uses this photo automatically for every new try-on in {{ merchant.name }}. Replace it here whenever you want to use a different photo.</p>
      <div v-if="shopper.restoringPhoto" class="mt-6 rounded-2xl border border-line bg-white p-6 text-sm text-muted">Restoring your private photo…</div>
      <PhotoUploader v-else class="mt-6" :merchant-id="merchant.id" />
    </main>
  </div>
  <div v-else-if="!loading" class="grid min-h-screen place-items-center p-8 text-center"><div><h1 class="text-2xl font-semibold">Store unavailable</h1><p class="mt-2 text-sm text-muted">Check the store link or return to the storefront.</p></div></div>
</template>
