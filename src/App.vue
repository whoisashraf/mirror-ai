<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useShopperStore } from '@/stores/shopper'

const shopper = useShopperStore()
const online = ref(navigator.onLine)
const update = () => { online.value = navigator.onLine }

onMounted(() => {
  shopper.ensureSession()
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
})
</script>
<template>
  <div v-if="!online" class="fixed inset-x-0 top-0 z-50 bg-ink px-4 py-2 text-center text-xs font-semibold text-white">You’re offline. Browsing may continue, but Mirror generation needs a connection.</div>
  <RouterView />
</template>
