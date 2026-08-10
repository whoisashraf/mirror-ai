<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getOwnedMerchant } from '@/lib/api'
const slug=ref('mirror-atelier')
onMounted(async()=>{const m=await getOwnedMerchant();if(m)slug.value=m.slug})
</script>
<template>
  <aside class="border-b border-line bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
    <div class="flex items-center justify-between px-5 py-5"><RouterLink to="/dashboard" class="font-bold tracking-tight">MIRROR</RouterLink><RouterLink :to="`/store/${slug}`" class="text-xs font-medium text-muted">View store ↗</RouterLink></div>
    <nav class="flex gap-1 overflow-x-auto px-3 pb-3 text-sm lg:block lg:space-y-1">
      <RouterLink v-for="item in [{to:'/dashboard',label:'Overview'},{to:'/dashboard/products',label:'Products'},{to:'/dashboard/analytics',label:'Analytics'},{to:'/dashboard/settings',label:'Settings'}]" :key="item.to" :to="item.to" class="block whitespace-nowrap rounded-xl px-3 py-2.5 text-muted hover:bg-paper hover:text-ink" active-class="!bg-paper !font-semibold !text-ink" exact>{{ item.label }}</RouterLink>
    </nav>
  </aside>
</template>
