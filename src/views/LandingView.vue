<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import StoreHomeView from '@/views/store/StoreHomeView.vue'
import { customTenantHost } from '@/lib/tenant'

const tenantHost = ref<string | null>(null)
onMounted(() => { tenantHost.value = customTenantHost() })
</script>
<template>
  <StoreHomeView v-if="tenantHost" />
  <main v-else class="min-h-screen bg-paper px-5 py-6 sm:px-8">
    <nav class="mx-auto flex max-w-6xl items-center justify-between"><div class="font-bold tracking-tight">MIRROR</div><RouterLink to="/dashboard" class="text-sm font-medium">Merchant dashboard</RouterLink></nav>
    <section class="mx-auto grid max-w-6xl gap-10 pb-14 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-28">
      <div><p class="text-xs font-semibold uppercase tracking-[.22em] text-muted">AI sales associate for fashion retailers</p><h1 class="mt-4 max-w-3xl text-5xl font-semibold tracking-[-.055em] sm:text-7xl">Your store. Your catalogue. Your AI stylist.</h1><p class="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">Mirror powers white-label virtual try-on and contextual styling inside each retailer’s own storefront. Shopper experiences stay merchant-isolated.</p><div class="mt-8 flex flex-wrap gap-3"><RouterLink to="/store/mirror-atelier"><AppButton>Open demo store</AppButton></RouterLink><RouterLink to="/dashboard"><AppButton variant="outline">View merchant analytics</AppButton></RouterLink></div></div>
      <div class="rounded-[2rem] bg-ink p-5 text-white sm:p-8"><p class="text-xs uppercase tracking-[.2em] text-white/60">Merchant-isolated flow</p><div class="mt-8 space-y-5 text-lg"><p>01 &nbsp; Shopper enters your branded storefront</p><p>02 &nbsp; Picks a product</p><p>03 &nbsp; Tries it on</p><p>04 &nbsp; Chats while current look stays visible</p><p>05 &nbsp; Adds merchant products to same visual look</p><p>06 &nbsp; Clicks back to your checkout</p></div></div>
    </section>
  </main>
</template>
