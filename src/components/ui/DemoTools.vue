<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { demoMode } from '@/lib/supabase'
import { useChatStore } from '@/stores/chat'
import { useShopperStore } from '@/stores/shopper'
import { useTryOnStore } from '@/stores/tryOn'

const route = useRoute()
const router = useRouter()
const chat = useChatStore()
const shopper = useShopperStore()
const tryOn = useTryOnStore()
const expanded = ref(false)
const visible = computed(() => demoMode || route.query.demo === '1')

async function resetDemo() {
  chat.reset()
  tryOn.reset()
  await shopper.clearPhoto().catch(() => undefined)
  localStorage.removeItem('mirror_demo_events')
  localStorage.removeItem('mirror_saved_looks')
  localStorage.removeItem('mirror_session_id')
  shopper.resetLocal()
  expanded.value = false
  await router.push('/store/mirror-atelier?demo=1')
}
</script>
<template>
  <div v-if="visible" class="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 z-[70]">
    <button v-if="!expanded" class="focus-ring rounded-full border border-black/10 bg-white/95 px-3 py-2 text-[10px] font-semibold shadow-lg backdrop-blur" @click="expanded=true">Demo tools</button>
    <div v-else class="w-56 rounded-[1.1rem] border border-black/10 bg-white p-3 shadow-xl">
      <div class="flex items-center justify-between"><p class="text-xs font-semibold">Demo operator</p><button class="h-7 w-7 rounded-full bg-paper text-xs" @click="expanded=false">×</button></div>
      <p class="mt-2 text-[10px] leading-4 text-muted">Reset the shopper session, chat, look history and local analytics before a pitch.</p>
      <button class="focus-ring mt-3 min-h-10 w-full rounded-full bg-ink px-3 text-xs font-semibold text-white" @click="resetDemo">Reset demo</button>
    </div>
  </div>
</template>
