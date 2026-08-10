<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/lib/format'
import { storefrontPath } from '@/lib/tenant'
import type { Merchant, Product } from '@/types'
const props = defineProps<{ product: Product; merchant: Merchant }>()
const href = computed(() => storefrontPath(props.merchant, `/product/${props.product.id}`))
</script>
<template>
  <RouterLink :to="href" class="group block">
    <div class="aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-cream">
      <img :src="product.primary_image_url" :alt="product.name" class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" />
    </div>
    <div class="flex items-start justify-between gap-3 pt-3">
      <div><h3 class="text-sm font-semibold leading-tight">{{ product.name }}</h3><p class="mt-1 text-xs text-muted">{{ product.category }}</p></div>
      <p class="whitespace-nowrap text-sm font-medium">{{ formatMoney(product.price, product.currency) }}</p>
    </div>
  </RouterLink>
</template>
