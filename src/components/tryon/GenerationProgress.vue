<script setup lang="ts">
import { computed } from 'vue'
import type { GenerationStatus } from '@/types'

const props = withDefaults(defineProps<{ status: GenerationStatus; productCount?: number }>(), { productCount:1 })
const steps = computed(() => [
  { key:'preparing', label:'Preparing your photo' },
  { key:'generating', label:props.productCount > 1 ? `Matching ${props.productCount} product references` : 'Matching the product reference' },
  { key:'finalizing', label:props.productCount > 1 ? 'Preserving shoes, accessories and outfit details' : 'Preserving product details' },
])
function level(key: string) { const order=['idle','preparing','generating','finalizing','completed']; return order.indexOf(props.status) >= order.indexOf(key) }
</script>
<template>
  <div class="mx-4 w-full max-w-sm rounded-[1.5rem] border border-line bg-white p-5">
    <div class="mb-5 flex items-center justify-between"><div><p class="text-xs font-semibold uppercase tracking-[.18em] text-muted">Mirror is working</p><h2 class="mt-1 text-lg font-semibold">Building your look</h2></div><div class="h-3 w-3 animate-pulse rounded-full bg-ink"></div></div>
    <div class="space-y-4"><div v-for="(step, i) in steps" :key="step.key" class="flex items-center gap-3"><div class="grid h-7 w-7 place-items-center rounded-full border text-xs font-semibold" :class="level(step.key) ? 'border-ink bg-ink text-white' : 'border-line text-muted'">{{ level(step.key) ? '✓' : i+1 }}</div><span class="text-sm" :class="level(step.key) ? 'font-medium text-ink' : 'text-muted'">{{ step.label }}</span></div></div>
    <p class="mt-5 text-xs leading-5 text-muted">AI-generated visual preview. Actual fit, fabric behaviour and proportions may vary in person.</p>
  </div>
</template>
