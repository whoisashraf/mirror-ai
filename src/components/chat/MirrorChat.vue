<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useShopperStore } from '@/stores/shopper'
import RecommendationCard from './RecommendationCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import type { MirrorAction } from '@/types'

const props = defineProps<{
  merchantId: string
  slug: string
  productId?: string
  generationId?: string
  assistantName?: string
  currentProductIds?: string[]
}>()
const emit = defineEmits<{
  tryCompleteLook: [productIds: string[]]
  addToLook: [productId: string]
  removeFromLook: [productId: string]
  replaceInLook: [productId: string, targetProductId?: string]
  shopLook: []
}>()

const chat = useChatStore()
const shopper = useShopperStore()
const input = ref('')
const scroller = ref<HTMLElement | null>(null)
const name = computed(() => props.assistantName || 'Mirror')
const prompts = ['Does this colour suit me?', 'Is this interview appropriate?', 'What can I pair with this?', 'Make this more casual.', 'Build a complete outfit around this.']
const latestRecommendations = computed(() => [...chat.messages].reverse().find((m) => m.role === 'assistant' && m.recommendations?.length)?.recommendations ?? [])

async function scrollToEnd() {
  await nextTick()
  if (scroller.value) scroller.value.scrollTo({ top: scroller.value.scrollHeight, behavior:'smooth' })
}

async function send(text?: string) {
  const message = (text ?? input.value).trim()
  if (!message) return
  input.value = ''
  void scrollToEnd()
  await chat.send({
    merchantId:props.merchantId,
    sessionId:shopper.sessionId,
    message,
    selectedProductId:props.productId,
    generationId:props.generationId,
    currentProductIds:props.currentProductIds,
  })
  await scrollToEnd()
}

function completeLook() {
  const ids = [props.productId, ...(props.currentProductIds || []), ...latestRecommendations.value.slice(0, 3).map((r) => r.productId)].filter(Boolean) as string[]
  emit('tryCompleteLook', [...new Set(ids)])
}

function executeAction(action: string | MirrorAction) {
  if (typeof action === 'string') {
    if (action === 'try_complete_look') completeLook()
    return
  }
  if (action.type === 'try_complete_look') completeLook()
  if (action.type === 'add_product' && action.productId) emit('addToLook', action.productId)
  if (action.type === 'remove_product' && action.productId) emit('removeFromLook', action.productId)
  if (action.type === 'replace_product' && action.productId) emit('replaceInLook', action.productId, action.targetProductId)
  if (action.type === 'shop_look') emit('shopLook')
}

function actionLabel(action: string | MirrorAction) {
  if (typeof action !== 'string') return action.label
  return action === 'try_complete_look' ? 'Try recommended pieces together' : action
}
</script>
<template>
  <section class="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-line bg-white h-full">
    <div class="shrink-0 border-b border-line p-4">
      <div class="flex items-center gap-3"><div class="grid h-9 w-9 place-items-center rounded-full bg-[var(--store-accent)] text-xs font-bold text-white">{{ name.slice(0,1).toUpperCase() }}</div><div><h2 class="text-sm font-semibold">{{ name }}</h2><p class="text-xs text-muted">Styling advice from this store’s catalogue</p></div></div>
    </div>
    <div ref="scroller" class="min-h-52 flex-1 space-y-4 overflow-y-auto p-4">
      <div v-if="!chat.messages.length"><p class="text-sm leading-6 text-muted">Ask about colour, occasion, styling, modest options or a budget. Your current generated look stays visible while the conversation changes it.</p><div class="mt-4 flex flex-wrap gap-2"><button v-for="p in prompts" :key="p" class="focus-ring rounded-full border border-line px-3 py-2 text-left text-xs hover:border-ink" @click="send(p)">{{ p }}</button></div></div>
      <template v-for="message in chat.messages" :key="message.id">
        <div :class="message.role === 'user' ? 'ml-auto bg-ink text-white' : 'mr-auto bg-paper text-ink'" class="max-w-[88%] rounded-[1.2rem] px-4 py-3 text-sm leading-6">{{ message.content }}</div>
        <div v-if="message.recommendations?.length" class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar">
          <RecommendationCard
            v-for="rec in message.recommendations"
            :key="rec.productId"
            :product-id="rec.productId"
            :reason="rec.reason"
            :slug="slug"
            :merchant-id="merchantId"
            :session-id="shopper.sessionId"
            :current-product-ids="currentProductIds"
            @add="emit('addToLook', $event)"
          />
        </div>
        <div v-if="message.role==='assistant' && message.suggestedActions?.length" class="flex flex-wrap gap-2">
          <button v-for="(action,index) in message.suggestedActions" :key="`${message.id}-${index}`" class="focus-ring min-h-10 rounded-full border border-[var(--store-accent)] px-3 text-[11px] font-semibold text-[var(--store-accent)]" @click="executeAction(action)">{{ actionLabel(action) }}</button>
        </div>
      </template>
      <div v-if="chat.sending" class="w-fit rounded-full bg-paper px-4 py-2 text-xs text-muted">{{ name }} is thinking…</div>
    </div>
    <div v-if="latestRecommendations.length" class="shrink-0 border-t border-line px-4 pt-3"><AppButton class="w-full" @click="completeLook">Try recommended products on this look</AppButton></div>
    <form class="flex shrink-0 gap-2 p-4" @submit.prevent="send()"><input v-model="input" class="focus-ring min-h-12 flex-1 rounded-full border border-line bg-paper px-4 text-sm outline-none" :placeholder="`Ask ${name} about this look…`" /><button class="focus-ring grid h-12 w-12 place-items-center rounded-full bg-[var(--store-accent)] text-white disabled:opacity-40" :disabled="chat.sending || !input.trim()">↑</button></form>
  </section>
</template>
