<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storefrontPath } from '@/lib/tenant'
import { getUserRole, initializeAuth, signOut, type AppRole } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Merchant } from '@/types'
const props = defineProps<{ merchant: Merchant }>()
const cfg = computed(() => props.merchant.storefront_config || {})
const home = computed(() => storefrontPath(props.merchant, '/'))
const router = useRouter()
const user = ref<User | null>(null)
const role = ref<AppRole | null>(null)
const menuOpen = ref(false)

async function refreshAccount(nextUser?: User | null) {
  user.value = nextUser === undefined ? await initializeAuth() : nextUser
  role.value = await getUserRole(user.value)
}

async function logout() {
  await signOut()
  user.value = null
  role.value = null
  menuOpen.value = false
  await router.push(home.value)
}

const authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
  window.setTimeout(() => void refreshAccount(session?.user ?? null), 0)
})
onMounted(() => void refreshAccount())
onBeforeUnmount(() => authSubscription.data.subscription.unsubscribe())
</script>
<template>
  <header class="sticky top-0 z-30 border-b border-black/10 bg-[var(--store-background)]/95 backdrop-blur">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
      <RouterLink :to="home" class="flex items-center gap-2 font-semibold tracking-[-.02em]">
        <img v-if="cfg.logoUrl || merchant.logo_url" :src="cfg.logoUrl || merchant.logo_url || ''" :alt="merchant.name" class="h-7 max-w-28 object-contain" />
        <span v-else>{{ merchant.name }}</span>
      </RouterLink>
      <div class="flex items-center gap-3">
        <div v-if="cfg.showPoweredByMirror !== false" class="hidden items-center gap-2 text-[11px] font-medium text-muted sm:flex">
          <span>Powered by</span><span class="text-[var(--store-text)]">MIRROR</span>
        </div>
        <div v-if="user" class="relative">
          <button class="focus-ring flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white/70 px-2.5 text-left" :aria-expanded="menuOpen" @click="menuOpen=!menuOpen">
            <span class="grid h-7 w-7 place-items-center rounded-full bg-[var(--store-accent)] text-[10px] font-bold text-white">{{ (user.email || 'U').slice(0,1).toUpperCase() }}</span>
            <span class="hidden max-w-32 truncate text-xs font-medium sm:block">{{ user.email }}</span>
          </button>
          <div v-if="menuOpen" class="absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-white p-2 text-ink shadow-xl">
            <div class="border-b border-line px-3 py-2"><p class="truncate text-xs font-semibold">{{ user.email }}</p><p class="mt-1 text-[10px] uppercase tracking-wider text-muted">{{ role === 'admin' ? 'Admin' : 'Shopper' }}</p></div>
            <RouterLink v-if="role==='admin'" to="/dashboard" class="mt-1 block rounded-xl px-3 py-2 text-xs font-medium hover:bg-paper" @click="menuOpen=false">Admin dashboard</RouterLink>
            <button class="mt-1 w-full rounded-xl px-3 py-2 text-left text-xs font-medium hover:bg-paper" @click="logout">Sign out</button>
          </div>
        </div>
        <RouterLink v-else :to="{path:'/auth',query:{redirect:$route.fullPath,role:'user'}}" class="focus-ring rounded-full border border-black/15 px-3 py-2 text-xs font-semibold">Sign in</RouterLink>
      </div>
    </div>
  </header>
</template>
