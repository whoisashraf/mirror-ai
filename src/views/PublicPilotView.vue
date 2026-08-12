<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import MetricCard from '@/components/dashboard/MetricCard.vue'
import { getPublicPilotMetrics } from '@/lib/api'
import type { PublicPilotSummary } from '@/types'

const data = ref<PublicPilotSummary | null>(null)
const loading = ref(true)
const error = ref('')
const maxFunnel = computed(() => Math.max(1, data.value?.funnel[0]?.value || 1))
onMounted(async () => {
  try { data.value = await getPublicPilotMetrics() }
  catch (caught) { error.value = caught instanceof Error ? caught.message : 'Pilot results could not be loaded.' }
  finally { loading.value = false }
})
</script>

<template>
  <main class="min-h-screen bg-paper px-5 py-6 sm:px-8">
    <nav class="mx-auto flex max-w-6xl items-center justify-between"><RouterLink to="/" class="font-bold tracking-tight">MIRROR</RouterLink><RouterLink to="/store/mirror-atelier" class="text-sm font-semibold">Experience the store →</RouterLink></nav>
    <section class="mx-auto max-w-6xl pb-16 pt-16 sm:pt-24">
      <p class="text-xs font-semibold uppercase tracking-[.22em] text-muted">Live pilot evidence · 30 days</p>
      <h1 class="mt-4 max-w-4xl text-4xl font-semibold tracking-[-.05em] sm:text-6xl">One retailer. Real shopper interactions. A measurable path to purchase.</h1>
      <p class="mt-5 max-w-3xl text-sm leading-7 text-muted sm:text-base">These figures are aggregate events observed inside {{data?.merchantName || 'the pilot store'}}. Checkout intent means a shopper clicked through to the retailer; purchases and revenue require the retailer’s commerce integration.</p>
      <div v-if="loading" class="mt-10 rounded-2xl border border-line bg-white p-6 text-sm text-muted">Loading observed pilot results…</div>
      <div v-else-if="error" class="mt-10 rounded-2xl border border-red-200 bg-white p-6"><p class="font-semibold">Results unavailable</p><p class="mt-2 text-sm text-red-700">{{error}}</p></div>
      <template v-else-if="data">
        <p class="mt-4 text-[10px] text-muted">Live Supabase events · refreshed {{new Date(data.generatedAt).toLocaleString()}}</p>
        <div class="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5"><MetricCard label="Active products" :value="data.productCount"/><MetricCard label="Shopper sessions" :value="data.shopperSessions"/><MetricCard label="Completed looks" :value="data.tryOns"/><MetricCard label="Stylist conversations" :value="data.conversations"/><MetricCard label="Checkout intent" :value="data.checkoutClicks"/></div>
        <div class="mt-6 rounded-[1.5rem] border border-line bg-white p-5 sm:p-7"><div class="flex flex-wrap items-end justify-between gap-3"><div><h2 class="text-xl font-semibold">Unique-session conversion funnel</h2><p class="mt-1 text-xs text-muted">Each stage includes sessions observed at the previous milestone.</p></div><div class="rounded-full bg-paper px-3 py-2 text-xs font-semibold">{{data.tryOnCompletionRate}}% generation completion</div></div><div class="mt-7 grid gap-3 md:grid-cols-4"><div v-for="(step,index) in data.funnel" :key="step.label" class="rounded-xl bg-paper p-4"><div class="flex items-center justify-between"><span class="text-xs font-medium text-muted">0{{index+1}}</span><span class="text-2xl font-semibold">{{step.value}}</span></div><div class="mt-3 h-2 overflow-hidden rounded-full bg-white"><div class="h-full rounded-full bg-ink" :style="{width:`${Math.max(step.value ? 8 : 0,(step.value/maxFunnel)*100)}%`}"></div></div><p class="mt-3 text-xs font-medium">{{step.label}}</p><p v-if="step.conversionFromPrevious!==null" class="mt-1 text-[10px] text-muted">{{step.conversionFromPrevious}}% from prior stage</p></div></div></div>
        <div class="mt-6 rounded-[1.5rem] bg-ink p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8"><div><p class="text-xs font-semibold uppercase tracking-[.18em] text-white/55">See the product behind the evidence</p><h2 class="mt-2 text-2xl font-semibold">Walk through the shopper experience.</h2></div><RouterLink to="/store/mirror-atelier" class="mt-5 block sm:mt-0"><AppButton class="!bg-white !text-ink">Open pilot store</AppButton></RouterLink></div>
      </template>
    </section>
  </main>
</template>
