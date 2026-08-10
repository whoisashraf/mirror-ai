<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { demoMode, supabase } from '@/lib/supabase'
import AppButton from '@/components/ui/AppButton.vue'
const router=useRouter(); const email=ref(''),password=ref(''),error=ref(''),loading=ref(false)
async function login(){ if(demoMode){router.push('/dashboard');return} loading.value=true; error.value=''; const {error:e}=await supabase!.auth.signInWithPassword({email:email.value,password:password.value}); loading.value=false; if(e)error.value=e.message;else router.push('/dashboard') }
</script>
<template><main class="grid min-h-screen place-items-center bg-paper px-5"><form class="w-full max-w-md rounded-[1.6rem] border border-line bg-white p-6" @submit.prevent="login"><p class="text-xs font-semibold uppercase tracking-[.2em] text-muted">Merchant access</p><h1 class="mt-2 text-3xl font-semibold tracking-tight">Sign in to Mirror</h1><p class="mt-2 text-sm text-muted">Demo mode accepts any credentials.</p><label class="mt-7 block text-xs font-medium">Email<input v-model="email" type="email" required class="mt-2 min-h-12 w-full rounded-xl border border-line px-3 outline-none focus:border-ink" placeholder="you@store.com"/></label><label class="mt-4 block text-xs font-medium">Password<input v-model="password" type="password" required class="mt-2 min-h-12 w-full rounded-xl border border-line px-3 outline-none focus:border-ink" placeholder="••••••••"/></label><p v-if="error" class="mt-3 text-xs text-red-700">{{ error }}</p><AppButton class="mt-5 w-full" type="submit" :disabled="loading">{{loading?'Signing in…':'Sign in'}}</AppButton></form></main></template>
