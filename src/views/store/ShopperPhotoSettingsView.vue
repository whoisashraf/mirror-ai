<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StoreHeader from '@/components/store/StoreHeader.vue'
import PhotoUploader from '@/components/tryon/PhotoUploader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { resolveMerchant } from '@/lib/api'
import { activateTenantScope, applyStorefrontTheme, customTenantHost, storefrontPath, tenantSlugFromRoute } from '@/lib/tenant'
import { useChatStore } from '@/stores/chat'
import { useShopperStore } from '@/stores/shopper'
import { useTryOnStore } from '@/stores/tryOn'
import type { Merchant } from '@/types'

const route = useRoute()
const router = useRouter()
const shopper = useShopperStore()
const chat = useChatStore()
const tryOn = useTryOnStore()
const merchant = ref<Merchant | null>(null)
const loading = ref(true)
const destination = computed(() => {
  const requested = typeof route.query.return === 'string' ? route.query.return : ''
  if (requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('/settings/photo')) return requested
  return merchant.value ? storefrontPath(merchant.value, '/') : '/'
})
const destinationLabel = computed(() => destination.value.includes('/product/') ? 'Return to product' : 'Continue shopping')

function leaveSettings() {
  void router.push(destination.value)
}

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
      <button class="focus-ring -ml-2 min-h-10 rounded-full px-2 text-sm font-medium" @click="leaveSettings">← {{destinationLabel}}</button>
      <p class="mt-6 text-xs font-semibold uppercase tracking-[.18em] opacity-55">Shopper settings</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">Your base photo</h1>
      <p class="mt-2 max-w-xl text-sm leading-6 opacity-65">Mirror uses this photo automatically for every new try-on in {{ merchant.name }}. Changes save immediately, then you can return to shopping.</p>
      <div v-if="shopper.restoringPhoto" class="mt-6 rounded-2xl border border-line bg-white p-6 text-sm text-muted">Restoring your private photo…</div>
      <PhotoUploader v-else class="mt-6" :merchant-id="merchant.id" :continue-label="destinationLabel" continue-description="Your base photo is saved and ready for your next try-on." @continue="leaveSettings" />
      <AppButton v-if="!shopper.imageUrl&&!shopper.restoringPhoto" variant="outline" class="mt-4 w-full" @click="leaveSettings">{{destinationLabel}} without a photo</AppButton>
    </main>
  </div>
  <div v-else-if="loading" class="grid min-h-screen place-items-center p-8 text-sm text-muted">Loading photo settings…</div>
  <div v-else class="grid min-h-screen place-items-center p-8 text-center"><div><h1 class="text-2xl font-semibold">Store unavailable</h1><p class="mt-2 text-sm text-muted">Check the store link or return to Mirror.</p><AppButton class="mt-5" @click="router.push('/')">Go to Mirror</AppButton></div></div>
</template>
