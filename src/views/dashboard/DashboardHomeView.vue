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
const days = ref(30)
const loading = ref(true)
const error = ref('')
const maxIntent = computed(() => Math.max(1, ...(data.value?.shopperIntents?.map((item) => item.count) || [1])))
const maxDaily = computed(() => Math.max(1, ...(data.value?.dailyActivity.map((item) => item.sessions) || [1])))
const recentDaily = computed(() => data.value?.dailyActivity.slice(-7) || [])

async function loadData() {
  if (!merchant.value) return
  loading.value = true
  error.value = ''
  try { data.value = await getAnalytics(merchant.value.id, days.value) }
  catch (caught) { error.value = caught instanceof Error ? caught.message : 'Analytics could not be loaded.' }
  finally { loading.value = false }
}

onMounted(async()=>{
  merchant.value = await getOwnedMerchant()
  if(!merchant.value){ router.replace('/auth'); return }
  await loadData()
})
</script>
<template>
  <div class="min-h-screen bg-paper lg:flex">
    <DashboardNav />
    <main class="flex-1 p-4 sm:p-6 lg:p-9">
      <div class="mx-auto max-w-6xl">
        <div class="flex flex-wrap items-end justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[.18em] text-muted">{{merchant?.name || 'Merchant'}}</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Your AI commerce pilot</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-muted">Observed shopper activity from your catalogue, measured from product interest to checkout intent.</p></div><label class="text-xs font-semibold text-muted">Reporting period<select v-model.number="days" class="mt-2 block min-h-11 rounded-xl border border-line bg-white px-3 text-ink" @change="loadData"><option :value="7">Last 7 days</option><option :value="30">Last 30 days</option><option :value="90">Last 90 days</option></select></label></div>
        <p v-if="data" class="mt-3 text-[10px] text-muted">Live Supabase events · refreshed {{ new Date(data.generatedAt).toLocaleString() }}</p>
        <p v-if="error" role="alert" class="mt-5 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">{{error}}</p>
        <div v-if="loading" class="mt-7 rounded-2xl border border-line bg-white p-6 text-sm text-muted">Loading observed pilot data…</div>

        <div v-if="data&&!loading" class="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard label="Active products" :value="data.productCount"/>
          <MetricCard label="Shopper sessions" :value="data.shopperSessions"/>
          <MetricCard label="Completed looks" :value="data.tryOns"/>
          <MetricCard label="Stylist conversations" :value="data.conversations"/>
          <MetricCard label="Checkout intent" :value="data.checkoutClicks"/>
        </div>

        <div v-if="data&&!loading" class="mt-6 rounded-[1.5rem] border border-line bg-white p-5 sm:p-6">
          <div class="flex items-center justify-between"><div><h2 class="font-semibold">Unique-session conversion funnel</h2><p class="mt-1 text-xs text-muted">Each stage includes only sessions observed at the preceding milestone.</p></div><RouterLink to="/dashboard/analytics" class="text-xs font-semibold underline">Details</RouterLink></div>
          <div class="mt-6 grid gap-2 md:grid-cols-4">
            <div v-for="(step,i) in data.funnel" :key="step.label" class="relative rounded-xl bg-paper p-3">
              <p class="text-2xl font-semibold">{{step.value}}</p><p class="mt-1 text-xs leading-4 text-muted">{{step.label}}</p>
              <p v-if="i>0" class="mt-2 text-[10px] font-semibold text-muted">{{step.conversionFromPrevious}}% from prior stage</p>
            </div>
          </div>
        </div>

        <div v-if="data&&!loading" class="mt-6 grid gap-3 sm:grid-cols-3"><div class="rounded-[1.3rem] border border-line bg-white p-4"><p class="text-2xl font-semibold">{{data.tryOnCompletionRate}}%</p><p class="mt-1 text-xs text-muted">Generation completion</p></div><div class="rounded-[1.3rem] border border-line bg-white p-4"><p class="text-2xl font-semibold">{{data.recommendationClickRate}}%</p><p class="mt-1 text-xs text-muted">Recommendation engagement</p><p class="mt-1 text-[10px] text-muted">{{data.recommendationClicks}} clicks from {{data.recommendationShown}} shown</p></div><div class="rounded-[1.3rem] border border-line bg-white p-4"><p class="text-2xl font-semibold">{{data.checkoutRate}}%</p><p class="mt-1 text-xs text-muted">Completed try-on to checkout intent</p></div></div>

        <section v-if="data&&!loading" class="mt-6 rounded-[1.5rem] border border-line bg-white p-5"><div><h2 class="font-semibold">Daily shopper activity</h2><p class="mt-1 text-xs text-muted">Unique observed sessions per day. The latest seven days are listed below for touch devices.</p></div><div class="hide-scrollbar mt-6 flex h-36 items-end gap-1 overflow-x-auto border-b border-line pb-1"><div v-for="item in data.dailyActivity" :key="item.date" class="group relative flex h-full min-w-3 flex-1 items-end" :title="`${item.date}: ${item.sessions} sessions, ${item.tryOns} completed looks, ${item.checkoutClicks} checkout clicks`"><div class="w-full rounded-t-sm bg-ink/80" :style="{height:`${Math.max(item.sessions?8:2,(item.sessions/maxDaily)*100)}%`}"></div></div></div><div class="mt-2 flex justify-between text-[9px] text-muted"><span>{{new Date(data.period.since).toLocaleDateString()}}</span><span>{{new Date(data.period.until).toLocaleDateString()}}</span></div><div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"><div v-for="item in recentDaily" :key="`detail-${item.date}`" class="rounded-xl bg-paper p-2.5"><p class="text-[9px] text-muted">{{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'})}}</p><p class="mt-1 text-sm font-semibold">{{item.sessions}} sessions</p><p class="mt-1 text-[9px] text-muted">{{item.tryOns}} looks · {{item.checkoutClicks}} checkout</p></div></div></section>

        <div v-if="data&&!loading" class="mt-6 grid gap-6 lg:grid-cols-2">
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
