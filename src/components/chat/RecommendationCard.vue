<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatMoney } from '@/lib/format'
import { getProduct, trackEvent } from '@/lib/api'
import { customTenantHost } from '@/lib/tenant'
import type { Product } from '@/types'

const props = defineProps<{ productId: string; reason: string; slug: string; merchantId: string; sessionId: string; currentProductIds?: string[] }>()
const emit = defineEmits<{ add: [productId: string] }>()
const product = ref<Product | null>(null)
const href = computed(() => customTenantHost() ? `/product/${props.productId}` : `/store/${props.slug}/product/${props.productId}`)
const alreadyInLook = computed(() => props.currentProductIds?.includes(props.productId) ?? false)
onMounted(async () => { product.value = await getProduct(props.productId) })
async function record(action: string) {
  await trackEvent('recommendation_clicked', { merchantId:props.merchantId, sessionId:props.sessionId, productId:props.productId, metadata:{action} })
}
async function add() {
  if (alreadyInLook.value) return
  await record('add_to_look')
  emit('add', props.productId)
}
</script>
<template>
  <article v-if="product" class="flex w-[82vw] max-w-[330px] shrink-0 gap-3 rounded-[1.2rem] border border-line bg-white p-3">
    <img :src="product.primary_image_url" :alt="product.name" class="h-28 w-20 rounded-xl object-cover" />
    <div class="min-w-0 flex flex-1 flex-col py-1">
      <div><p class="truncate text-sm font-semibold">{{ product.name }}</p><p class="mt-1 text-xs font-medium">{{ formatMoney(product.price, product.currency) }}</p><p class="mt-2 line-clamp-2 text-xs leading-4 text-muted">{{ reason }}</p></div>
      <div class="mt-auto flex gap-2 pt-3">
        <button class="focus-ring min-h-9 flex-1 rounded-full bg-ink px-3 text-[10px] font-semibold text-white disabled:bg-line disabled:text-muted" :disabled="alreadyInLook" @click="add">{{ alreadyInLook ? 'In look ✓' : 'Add to look' }}</button>
        <RouterLink :to="href" class="focus-ring grid min-h-9 place-items-center rounded-full border border-line px-3 text-[10px] font-semibold" @click="record('view_product')">View</RouterLink>
      </div>
    </div>
  </article>
</template>
