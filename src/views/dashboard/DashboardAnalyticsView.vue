<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DashboardNav from '@/components/dashboard/DashboardNav.vue'
import { getAnalytics, getOwnedMerchant } from '@/lib/api'
import type { AnalyticsSummary } from '@/types'

const data = ref<AnalyticsSummary | null>(null)
const maxFunnel = computed(() => Math.max(1, data.value?.funnel[0]?.value || 1))
onMounted(async()=>{ const merchant=await getOwnedMerchant(); if(merchant) data.value=await getAnalytics(merchant.id) })
</script>
<template>
  <div class="min-h-screen bg-paper lg:flex"><DashboardNav/><main class="flex-1 p-4 sm:p-6 lg:p-9"><div class="mx-auto max-w-5xl">
    <p class="text-xs font-semibold uppercase tracking-[.18em] text-muted">Behaviour</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Analytics</h1><p class="mt-2 max-w-2xl text-sm text-muted">Mirror records the path from product interest to try-on, conversation, recommendation and checkout intent. Purchase/revenue attribution remains separate until a merchant integration confirms it.</p>
    <div v-if="data" class="mt-7 space-y-3">
      <div v-for="(step,i) in data.funnel" :key="step.label" class="rounded-[1.2rem] border border-line bg-white p-4"><div class="flex items-center justify-between"><span class="text-sm font-medium">{{step.label}}</span><span class="text-2xl font-semibold">{{step.value}}</span></div><div class="mt-3 h-2 overflow-hidden rounded-full bg-paper"><div class="h-full rounded-full bg-ink" :style="{width:`${Math.max(5,(step.value/maxFunnel)*100)}%`}"></div></div><p v-if="i<data.funnel.length-1" class="mt-2 text-xs text-muted">{{ Math.round((data.funnel[i+1].value / Math.max(1,step.value))*100) }}% continue to next step</p></div>
    </div>
    <div v-if="data" class="mt-7 grid gap-5 md:grid-cols-2">
      <section class="rounded-[1.3rem] border border-line bg-white p-5"><h2 class="font-semibold">Shopper question themes</h2><div class="mt-4 space-y-3"><div v-for="intent in data.shopperIntents || []" :key="intent.label" class="flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-3 text-xs"><span class="font-medium">{{intent.label}}</span><span class="text-muted">{{intent.count}} · {{intent.share}}%</span></div><p v-if="!data.shopperIntents?.length" class="text-xs text-muted">No aggregated question themes yet.</p></div></section>
      <section class="rounded-[1.3rem] border border-line bg-white p-5"><h2 class="font-semibold">Top interaction products</h2><div class="mt-4 space-y-3"><div v-for="item in data.topProducts || []" :key="item.productId" class="rounded-xl bg-paper px-3 py-3"><p class="text-xs font-semibold">{{item.name}}</p><p class="mt-1 text-[10px] text-muted">{{item.tryOns}} try-ons · {{item.recommendationClicks}} recommendation clicks</p></div><p v-if="!data.topProducts?.length" class="text-xs text-muted">No product interaction ranking yet.</p></div></section>
    </div>
  </div></main></div>
</template>
