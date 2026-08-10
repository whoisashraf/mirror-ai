<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DashboardNav from '@/components/dashboard/DashboardNav.vue'
import MetricCard from '@/components/dashboard/MetricCard.vue'
import { getAnalytics, getOwnedMerchant } from '@/lib/api'
import type { AnalyticsSummary, Merchant } from '@/types'

const router = useRouter()
const data = ref<AnalyticsSummary | null>(null)
const merchant = ref<Merchant | null>(null)
const maxIntent = computed(() => Math.max(1, ...(data.value?.shopperIntents?.map((item) => item.count) || [1])))

onMounted(async()=>{
  merchant.value = await getOwnedMerchant()
  if(!merchant.value){ router.replace('/auth'); return }
  data.value = await getAnalytics(merchant.value.id)
})
</script>
<template>
  <div class="min-h-screen bg-paper lg:flex">
    <DashboardNav />
    <main class="flex-1 p-4 sm:p-6 lg:p-9">
      <div class="mx-auto max-w-6xl">
        <p class="text-xs font-semibold uppercase tracking-[.18em] text-muted">{{merchant?.name || 'Merchant'}}</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">Mirror performance</h1>
        <p class="mt-2 text-sm text-muted">What shoppers tried, asked about and showed purchase intent for during the pilot.</p>

        <div v-if="data" class="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard label="Products" :value="data.productCount"/>
          <MetricCard label="Try-ons" :value="data.tryOns"/>
          <MetricCard label="Conversations" :value="data.conversations"/>
          <MetricCard label="Recommendation clicks" :value="data.recommendationClicks"/>
          <MetricCard label="Checkout intent" :value="data.checkoutClicks"/>
        </div>

        <div v-if="data" class="mt-6 rounded-[1.5rem] border border-line bg-white p-5 sm:p-6">
          <div class="flex items-center justify-between"><div><h2 class="font-semibold">Shopper funnel</h2><p class="mt-1 text-xs text-muted">Pilot interaction data, not revenue attribution.</p></div><RouterLink to="/dashboard/analytics" class="text-xs font-semibold underline">Details</RouterLink></div>
          <div class="mt-6 grid gap-2 md:grid-cols-6">
            <div v-for="(step,i) in data.funnel" :key="step.label" class="relative rounded-xl bg-paper p-3">
              <p class="text-2xl font-semibold">{{step.value}}</p><p class="mt-1 text-xs leading-4 text-muted">{{step.label}}</p>
              <p v-if="i < data.funnel.length-1" class="mt-2 text-[10px] font-semibold text-muted">{{ Math.round((data.funnel[i+1].value / Math.max(1,step.value))*100) }}% →</p>
            </div>
          </div>
        </div>

        <div v-if="data" class="mt-6 grid gap-6 lg:grid-cols-2">
          <section class="rounded-[1.5rem] border border-line bg-white p-5">
            <h2 class="font-semibold">What shoppers are asking</h2><p class="mt-1 text-xs text-muted">Intent themes are aggregated; merchants do not need raw private conversations to see demand signals.</p>
            <div class="mt-5 space-y-4">
              <div v-for="intent in data.shopperIntents || []" :key="intent.label"><div class="flex items-center justify-between gap-3 text-xs"><span class="font-medium">{{ intent.label }}</span><span class="text-muted">{{ intent.share }}%</span></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-paper"><div class="h-full rounded-full bg-ink" :style="{width:`${Math.max(8,(intent.count/maxIntent)*100)}%`}"></div></div></div>
              <p v-if="!data.shopperIntents?.length" class="text-xs text-muted">Intent themes appear after shoppers start asking Mirror questions.</p>
            </div>
          </section>

          <section class="rounded-[1.5rem] border border-line bg-white p-5">
            <h2 class="font-semibold">Products generating interest</h2><p class="mt-1 text-xs text-muted">Try-ons and recommendation clicks reveal more than a page view alone.</p>
            <div class="mt-5 divide-y divide-line">
              <div v-for="item in data.topProducts || []" :key="item.productId" class="flex items-center justify-between gap-4 py-3 first:pt-0"><div class="min-w-0"><p class="truncate text-xs font-semibold">{{ item.name }}</p><p class="mt-1 text-[10px] text-muted">{{ item.tryOns }} try-ons · {{ item.recommendationClicks }} recommendation clicks</p></div><span class="rounded-full bg-paper px-2.5 py-1 text-[10px] font-semibold">{{ item.tryOns + item.recommendationClicks }}</span></div>
              <p v-if="!data.topProducts?.length" class="text-xs text-muted">Product insights appear as the pilot generates interaction data.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>
