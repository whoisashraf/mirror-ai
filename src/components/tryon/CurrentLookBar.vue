<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/lib/format'
import type { Product } from '@/types'

const props = defineProps<{ products: Product[]; busy?: boolean }>()
const emit = defineEmits<{ remove: [productId: string] }>()
const total = computed(() => props.products.reduce((sum, product) => sum + Number(product.price || 0), 0))
</script>
<template>
  <div class="flex shrink-0 items-center gap-3 border-b border-line bg-white px-4 py-2.5">
    <div class="shrink-0"><p class="text-[9px] font-semibold uppercase tracking-[.18em] text-muted">Look · {{ products.length }}</p><p v-if="products.length" class="mt-0.5 text-[11px] font-semibold">{{ formatMoney(total, products[0].currency) }}</p></div>
    <div class="hide-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
      <div v-for="product in products" :key="product.id" class="flex shrink-0 items-center gap-2 rounded-full border border-line bg-paper py-1.5 pl-1.5 pr-2">
        <img :src="product.primary_image_url" :alt="product.name" class="h-8 w-8 rounded-full object-cover" />
        <div class="max-w-32"><p class="truncate text-[11px] font-semibold">{{ product.name }}</p><p class="text-[9px] uppercase tracking-wide text-muted">{{ product.try_on_category || product.category }}</p></div>
        <button class="focus-ring ml-1 grid h-7 w-7 place-items-center rounded-full bg-white text-xs disabled:opacity-40" :disabled="busy || products.length <= 1" :aria-label="`Remove ${product.name}`" @click="emit('remove', product.id)">×</button>
      </div>
      <div v-if="!products.length" class="rounded-full border border-dashed border-line px-4 py-2 text-xs text-muted">No products in this look yet.</div>
    </div>
  </div>
</template>
