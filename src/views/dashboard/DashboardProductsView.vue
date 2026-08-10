<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DashboardNav from '@/components/dashboard/DashboardNav.vue'
import ProductForm from '@/components/dashboard/ProductForm.vue'
import { archiveProduct, deleteProduct, getOwnedMerchant, getProducts, saveProduct } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import type { Merchant, Product } from '@/types'
const products=ref<Product[]>([]),merchant=ref<Merchant|null>(null),editing=ref<Product|null>(null),showForm=ref(false),error=ref('')
async function load(){merchant.value=await getOwnedMerchant();if(merchant.value)products.value=await getProducts(merchant.value.id)}
onMounted(load)
async function save(payload:any){if(!merchant.value)return;try{await saveProduct(merchant.value.id,payload,editing.value?.id);showForm.value=false;editing.value=null;await load()}catch(e){error.value=String(e)}}
function edit(p:Product){editing.value=p;showForm.value=true}
async function archive(p:Product){if(!merchant.value)return;await archiveProduct(merchant.value.id,p.id);await load()}
async function remove(p:Product){if(!merchant.value||!confirm(`Delete ${p.name}?`))return;await deleteProduct(merchant.value.id,p.id);await load()}
</script>
<template><div class="min-h-screen bg-paper lg:flex"><DashboardNav/><main class="flex-1 p-4 sm:p-6 lg:p-9"><div class="mx-auto max-w-6xl"><div class="flex items-end justify-between"><div><p class="text-xs font-semibold uppercase tracking-[.18em] text-muted">Catalogue</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Products</h1></div><button class="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white" @click="editing=null;showForm=true">+ Add product</button></div><div v-if="showForm" class="mt-6 rounded-[1.4rem] border border-line bg-white p-5"><h2 class="mb-5 font-semibold">{{editing?'Edit product':'Add product'}}</h2><ProductForm :key="editing?.id || 'new'" :product="editing" @save="save" @cancel="showForm=false;editing=null"/></div><p v-if="error" class="mt-3 text-xs text-red-700">{{error}}</p><div class="mt-7 overflow-hidden rounded-[1.4rem] border border-line bg-white"><div v-for="p in products" :key="p.id" class="flex items-center gap-3 border-b border-line p-3 last:border-0"><img :src="p.primary_image_url" class="h-16 w-14 rounded-lg object-cover"/><div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">{{p.name}}</p><p class="mt-1 text-xs text-muted">{{p.category}} · {{p.stock_status.replace('_',' ')}}</p></div><p class="hidden text-sm font-medium sm:block">{{formatMoney(p.price,p.currency)}}</p><div class="flex gap-1 text-xs"><button class="rounded-lg px-2 py-2 hover:bg-paper" @click="edit(p)">Edit</button><button class="rounded-lg px-2 py-2 hover:bg-paper" @click="archive(p)">Archive</button><button class="rounded-lg px-2 py-2 text-red-700 hover:bg-red-50" @click="remove(p)">Delete</button></div></div></div></div></main></div></template>
