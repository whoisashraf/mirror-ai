<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useShopperStore } from '@/stores/shopper'
import { useTryOnStore } from '@/stores/tryOn'
import { useChatStore } from '@/stores/chat'
import { clearSavedLooks } from '@/lib/savedLooks'
import { supabase } from '@/lib/supabase'

const shopper = useShopperStore()
const tryOn = useTryOnStore()
const chat = useChatStore()
const online = ref(navigator.onLine)
const update = () => { online.value = navigator.onLine }

onMounted(() => {
  shopper.ensureSession()
  void supabase.auth.getUser().then(({data}) => resetAccountScope(data.user?.id || null))
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
})

function resetAccountScope(userId: string | null) {
  if (!shopper.syncAuthenticatedUser(userId)) return
  tryOn.reset()
  chat.reset()
  clearSavedLooks()
}

const authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
  window.setTimeout(() => resetAccountScope(session?.user?.id || null), 0)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
  authSubscription.data.subscription.unsubscribe()
})
</script>
<template>
  <div v-if="!online" class="fixed inset-x-0 top-0 z-50 bg-ink px-4 py-2 text-center text-xs font-semibold text-white">You’re offline. Browsing may continue, but Mirror generation needs a connection.</div>
  <RouterView />
</template>
