<script setup lang="ts">
import { computed } from 'vue'
import { storefrontPath } from '@/lib/tenant'
import type { Merchant } from '@/types'
const props = defineProps<{ merchant: Merchant }>()
const cfg = computed(() => props.merchant.storefront_config || {})
const home = computed(() => storefrontPath(props.merchant, '/'))
</script>
<template>
  <header class="sticky top-0 z-30 border-b border-black/10 bg-[var(--store-background)]/95 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
      <RouterLink :to="home" class="flex items-center gap-2 font-semibold tracking-[-.02em]">
        <img v-if="cfg.logoUrl || merchant.logo_url" :src="cfg.logoUrl || merchant.logo_url || ''" :alt="merchant.name" class="h-7 max-w-28 object-contain" />
        <span v-else>{{ merchant.name }}</span>
      </RouterLink>
      <div v-if="cfg.showPoweredByMirror !== false" class="flex items-center gap-2 text-[11px] font-medium text-muted">
        <span class="hidden sm:inline">Powered by</span><span class="text-[var(--store-text)]">MIRROR</span>
      </div>
    </div>
  </header>
</template>
