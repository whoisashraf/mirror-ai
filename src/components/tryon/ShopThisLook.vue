<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/lib/format'
import AppButton from '@/components/ui/AppButton.vue'
import type { Product } from '@/types'

const props = defineProps<{ products: Product[] }>()
const emit = defineEmits<{ buy: [product: Product] }>()
const total = computed(() => props.products.reduce((sum, product) => sum + Number(product.price || 0), 0))
</script>
<template>
  <section class="rounded-[1.3rem] border border-line bg-white p-4">
    <div class="flex items-start justify-between gap-4"><div><p class="text-[10px] font-semibold uppercase tracking-[.18em] text-muted">Shop this look</p><h3 class="mt-1 font-semibold">Everything in your current outfit</h3></div><p v-if="products.length" class="text-sm font-semibold">{{ formatMoney(total, products[0].currency) }}</p></div>
    <div class="mt-4 divide-y divide-line">
      <div v-for="product in products" :key="product.id" class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
        <img :src="product.primary_image_url" :alt="product.name" class="h-14 w-12 rounded-lg object-cover" />
        <div class="min-w-0 flex-1"><p class="truncate text-xs font-semibold">{{ product.name }}</p><p class="mt-1 text-[11px] text-muted">{{ formatMoney(product.price, product.currency) }}</p></div>
        <button class="focus-ring min-h-10 rounded-full border border-line px-3 text-[11px] font-semibold hover:border-ink" @click="emit('buy', product)">Buy ↗</button>
      </div>
    </div>
    <p class="mt-4 text-[10px] leading-4 text-muted">Mirror opens the merchant’s product pages. The MVP does not claim a synchronized multi-item cart.</p>
  </section>
</template>
