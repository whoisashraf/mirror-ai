<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { getOwnedMerchant } from '@/lib/api'
import AppButton from '@/components/ui/AppButton.vue'
import { useShopperStore } from '@/stores/shopper'
import { useTryOnStore } from '@/stores/tryOn'
import { useChatStore } from '@/stores/chat'
import { clearSavedLooks } from '@/lib/savedLooks'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const error = ref('')
const notice = ref('')
const loading = ref(false)
const creatingAccount = ref(false)
const shopper = useShopperStore()
const tryOn = useTryOnStore()
const chat = useChatStore()
const adminFlow = computed(() => route.query.role === 'admin' || (typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/dashboard')))
const redirect = computed(() => typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//') ? route.query.redirect : adminFlow.value ? '/dashboard' : '/')
const shopperFlow = computed(() => !adminFlow.value)
const backTo = computed(() => {
  const requested = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return shopperFlow.value && requested.startsWith('/') && !requested.startsWith('//') && !requested.startsWith('/try-on/') && !requested.includes('/try-on/') ? requested : '/'
})

async function continueAfterAuth(userId: string) {
  if (shopper.syncAuthenticatedUser(userId)) {
    tryOn.reset()
    chat.reset()
    clearSavedLooks()
  }
  if (!shopperFlow.value) {
    const existing = await getOwnedMerchant()
    if (!existing) throw new Error('This account is not assigned to a merchant store.')
  }
  await router.replace(redirect.value)
}

onMounted(async () => {
  const { data } = await supabase.auth.getUser()
  if (data.user) await continueAfterAuth(data.user.id)
})

async function submit() {
  loading.value = true
  error.value = ''
  notice.value = ''

  try {
    if (creatingAccount.value) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      })
      if (signUpError) throw signUpError
      if (!data.session) {
        notice.value = 'Check your email to confirm the account, then return here to sign in.'
        creatingAccount.value = false
        return
      }
      if (!data.user) throw new Error('The new account could not be loaded.')
      await continueAfterAuth(data.user.id)
      return
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    })
    if (signInError) throw signInError
    if (!data.user) throw new Error('The signed-in account could not be loaded.')
    await continueAfterAuth(data.user.id)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Authentication failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-paper px-5">
    <form class="w-full max-w-md rounded-[1.6rem] border border-line bg-white p-6" @submit.prevent="submit">
      <RouterLink :to="backTo" class="mb-6 inline-block text-xs font-semibold text-muted">← Back</RouterLink>
      <p class="text-xs font-semibold uppercase tracking-[.2em] text-muted">{{ shopperFlow ? 'Shopper access' : 'Merchant access' }}</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ creatingAccount ? 'Create your account' : 'Sign in to Mirror' }}</h1>
      <p class="mt-2 text-sm leading-6 text-muted">
        {{ shopperFlow ? 'Sign in or create an account before uploading a photo and starting your private try-on.' : 'Use the merchant account assigned to your store.' }}
      </p>
      <label class="mt-7 block text-xs font-medium">Email
        <input v-model="email" type="email" autocomplete="email" required class="mt-2 min-h-12 w-full rounded-xl border border-line px-3 outline-none focus:border-ink" placeholder="you@store.com" />
      </label>
      <label class="mt-4 block text-xs font-medium">Password
        <input v-model="password" type="password" :autocomplete="creatingAccount ? 'new-password' : 'current-password'" minlength="8" required class="mt-2 min-h-12 w-full rounded-xl border border-line px-3 outline-none focus:border-ink" placeholder="At least 8 characters" />
      </label>
      <p v-if="error" class="mt-3 text-xs leading-5 text-red-700">{{ error }}</p>
      <p v-if="notice" class="mt-3 text-xs leading-5 text-green-700">{{ notice }}</p>
      <AppButton class="mt-5 w-full" type="submit" :disabled="loading">
        {{ loading ? 'Please wait…' : creatingAccount ? 'Create account' : 'Sign in' }}
      </AppButton>
      <button v-if="shopperFlow" type="button" class="mt-4 w-full text-center text-xs font-semibold underline" @click="creatingAccount=!creatingAccount;error='';notice=''">
        {{ creatingAccount ? 'Already have an account? Sign in' : 'No account yet? Create one' }}
      </button>
    </form>
  </main>
</template>
