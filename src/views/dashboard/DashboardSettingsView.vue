<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DashboardNav from '@/components/dashboard/DashboardNav.vue'
import { getOwnedMerchant, updateMerchant } from '@/lib/api'
import type { Merchant } from '@/types'

const merchant = ref<Merchant | null>(null)
const saved = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const cfg = computed(() => merchant.value?.storefront_config || {})
onMounted(async()=>{ try{merchant.value=await getOwnedMerchant();if(merchant.value&&!merchant.value.storefront_config)merchant.value.storefront_config={}}catch(caught){error.value=caught instanceof Error?caught.message:'Settings could not be loaded.'}finally{loading.value=false} })
async function save(){if(!merchant.value||saving.value)return;saving.value=true;saved.value=false;error.value='';try{merchant.value=await updateMerchant(merchant.value);saved.value=true;setTimeout(()=>saved.value=false,1800)}catch(caught){error.value=caught instanceof Error?caught.message:'Settings could not be saved.'}finally{saving.value=false}}
</script>
<template>
  <div class="min-h-screen bg-paper lg:flex"><DashboardNav/><main class="flex-1 p-4 sm:p-6 lg:p-9"><div v-if="loading" class="mx-auto max-w-6xl rounded-2xl border border-line bg-white p-6 text-sm text-muted">Loading store settings…</div><div v-else-if="merchant" class="mx-auto max-w-6xl">
    <h1 class="text-3xl font-semibold tracking-tight">Store & white-label settings</h1><p class="mt-2 text-sm text-muted">These settings affect only this merchant’s shopper experience. Other stores are never promoted inside it.</p>
    <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div class="rounded-[1.4rem] border border-line bg-white p-5"><div class="grid gap-5">
        <div class="grid gap-4 sm:grid-cols-2"><label class="text-xs font-medium">Store name<input v-model="merchant.name" class="mt-2 min-h-12 w-full rounded-xl border border-line px-3"/></label><label class="text-xs font-medium">Hosted slug<input v-model="merchant.slug" class="mt-2 min-h-12 w-full rounded-xl border border-line px-3"/></label></div>
        <label class="text-xs font-medium">Custom domain<input v-model="merchant.custom_domain" placeholder="tryon.yourstore.com" class="mt-2 min-h-12 w-full rounded-xl border border-line px-3"/><span class="mt-1 block font-normal text-muted">Point this hostname to the Mirror deployment. The app resolves the merchant from the hostname.</span></label>
        <label class="text-xs font-medium">Description<textarea v-model="merchant.description" rows="3" class="mt-2 w-full rounded-xl border border-line p-3"></textarea></label>
        <div class="border-t border-line pt-5"><h2 class="font-semibold">Storefront branding</h2><div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="text-xs font-medium">Hero title<input v-model="merchant.storefront_config!.heroTitle" class="mt-2 min-h-12 w-full rounded-xl border border-line px-3"/></label>
          <label class="text-xs font-medium">Assistant name<input v-model="merchant.storefront_config!.assistantName" placeholder="Tehila Stylist" class="mt-2 min-h-12 w-full rounded-xl border border-line px-3"/></label>
          <label class="text-xs font-medium sm:col-span-2">Hero copy<textarea v-model="merchant.storefront_config!.heroCopy" rows="3" class="mt-2 w-full rounded-xl border border-line p-3"></textarea></label>
          <label class="text-xs font-medium">Logo URL<input v-model="merchant.storefront_config!.logoUrl" type="url" class="mt-2 min-h-12 w-full rounded-xl border border-line px-3"/></label>
          <label class="text-xs font-medium">Hero image URL<input v-model="merchant.storefront_config!.heroImageUrl" type="url" class="mt-2 min-h-12 w-full rounded-xl border border-line px-3"/></label>
          <label class="text-xs font-medium">Accent colour<input v-model="merchant.storefront_config!.accentColor" placeholder="#111111" class="mt-2 min-h-12 w-full rounded-xl border border-line px-3"/></label>
          <label class="text-xs font-medium">Background colour<input v-model="merchant.storefront_config!.backgroundColor" placeholder="#f7f5f1" class="mt-2 min-h-12 w-full rounded-xl border border-line px-3"/></label>
          <label class="text-xs font-medium">Try-on button label<input v-model="merchant.storefront_config!.tryOnLabel" placeholder="Try it on" class="mt-2 min-h-12 w-full rounded-xl border border-line px-3"/></label>
          <label class="flex items-center gap-3 pt-7 text-xs font-medium"><input v-model="merchant.storefront_config!.showPoweredByMirror" type="checkbox"/> Show “Powered by Mirror”</label>
        </div></div>
        <p v-if="error" role="alert" class="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">{{error}}</p><button class="min-h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-55" :disabled="saving" @click="save">{{saving?'Saving…':saved?'Saved ✓':'Save settings'}}</button>
      </div></div>

      <aside class="xl:sticky xl:top-8 xl:self-start"><p class="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-muted">Live storefront preview</p><div class="overflow-hidden rounded-[1.6rem] border border-line shadow-sm" :style="{background:cfg.backgroundColor || '#f7f5f1',color:cfg.textColor || '#111111'}">
        <div class="flex h-14 items-center justify-between border-b border-black/10 px-4"><div class="flex items-center gap-2"><img v-if="cfg.logoUrl" :src="cfg.logoUrl" alt="" class="h-8 w-8 rounded-full object-cover"/><span class="text-sm font-semibold">{{merchant.name}}</span></div><span v-if="cfg.showPoweredByMirror" class="text-[9px] opacity-50">Powered by Mirror</span></div>
        <div class="p-5"><p class="text-[9px] font-semibold uppercase tracking-[.18em] opacity-55">{{merchant.name}}</p><h2 class="mt-2 text-3xl font-semibold tracking-[-.04em]">{{cfg.heroTitle || 'Find the look. See yourself in it.'}}</h2><p class="mt-3 text-xs leading-5 opacity-65">{{cfg.heroCopy || merchant.description}}</p><div v-if="cfg.heroImageUrl" class="mt-4 overflow-hidden rounded-[1.2rem]"><img :src="cfg.heroImageUrl" alt="" class="aspect-[4/3] w-full object-cover"/></div><button class="mt-5 min-h-11 rounded-full px-4 text-xs font-semibold text-white" :style="{background:cfg.accentColor || merchant.primary_brand_colour || '#111'}">{{cfg.tryOnLabel || 'Try it on'}}</button></div>
      </div></aside>
    </div>
  </div><div v-else class="mx-auto max-w-6xl rounded-2xl border border-line bg-white p-6"><h1 class="font-semibold">Store settings unavailable</h1><p class="mt-2 text-sm text-muted">Refresh the page or sign in with the merchant account that owns this store.</p><p v-if="error" role="alert" class="mt-3 text-xs text-red-700">{{error}}</p></div></main></div>
</template>
