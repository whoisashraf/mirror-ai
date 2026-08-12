<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { formatMoney } from '@/lib/format'
import { getProduct, trackEvent } from '@/lib/api'
import { customTenantHost } from '@/lib/tenant'
import type { Product } from '@/types'

const props = defineProps<{ productId: string; reason: string; slug: string; merchantId: string; sessionId: string; currentProductIds?: string[]; selected?: boolean; selectionDisabled?: boolean }>()
const emit = defineEmits<{ toggle: [productId: string] }>()
const route = useRoute()
const product = ref<Product | null>(null)
const href = computed(() => ({ path:customTenantHost() ? `/product/${props.productId}` : `/store/${props.slug}/product/${props.productId}`, query:{ return:route.fullPath } }))
const alreadyInLook = computed(() => props.currentProductIds?.includes(props.productId) ?? false)
onMounted(async () => { product.value = await getProduct(props.productId) })
async function record(action: string) {
  await trackEvent('recommendation_clicked', { merchantId:props.merchantId, sessionId:props.sessionId, productId:props.productId, metadata:{action} })
}
async function toggle() {
  if (alreadyInLook.value) return
  await record(props.selected ? 'remove_from_selection' : 'select_for_look')
  emit('toggle', props.productId)
}
</script>
<template>
  <article v-if="product" class="flex min-w-0 gap-2.5 rounded-[1.2rem] border border-line bg-white p-2.5">
    <img :src="product.primary_image_url" :alt="product.name" class="h-16 w-14 shrink-0 rounded-xl object-cover" />
    <div class="min-w-0 flex flex-1 flex-col py-1">
      <div><p class="truncate text-xs font-semibold">{{ product.name }}</p><p class="mt-0.5 text-[11px] font-medium">{{ formatMoney(product.price, product.currency) }}</p><p class="mt-1 text-[10px] leading-4 text-muted">{{ reason }}</p></div>
      <div class="mt-auto flex gap-2 pt-2">
        <button class="focus-ring min-h-8 flex-1 rounded-full px-2 text-[9px] font-semibold disabled:bg-line disabled:text-muted" :class="selected ? 'bg-[var(--store-accent)] text-white' : 'bg-ink text-white'" :disabled="alreadyInLook || (selectionDisabled && !selected)" @click="toggle">{{ alreadyInLook ? 'In look ✓' : selected ? 'Selected ✓' : selectionDisabled ? 'Look full' : 'Select' }}</button>
        <RouterLink :to="href" class="focus-ring grid min-h-8 place-items-center rounded-full border border-line px-2 text-[9px] font-semibold" @click="record('view_product')">View</RouterLink>
      </div>
    </div>
  </article>
</template>
