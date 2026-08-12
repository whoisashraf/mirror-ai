<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShopperStore } from '@/stores/shopper'
import { trackEvent } from '@/lib/api'
import AppButton from '@/components/ui/AppButton.vue'
import type { TryOnCategory } from '@/types'
import { initializeAuth } from '@/lib/auth'

const props = defineProps<{ merchantId?: string; productId?: string; tryOnCategory?: TryOnCategory }>()
const shopper = useShopperStore()
const route = useRoute()
const router = useRouter()
const consent = ref(false)
const input = ref<HTMLInputElement | null>(null)
const error = ref('')
watch(() => shopper.consentAt, (value) => { if (value) consent.value = true }, { immediate:true })
const photoGuidance = computed(() => {
  if (props.tryOnCategory === 'shoes') return 'Use a clear full-body photo with both feet visible. Avoid cropped legs or shoes hidden behind objects.'
  if (props.tryOnCategory === 'earrings' || props.tryOnCategory === 'headwear') return 'Use a clear photo where your face, ears and head are visible.'
  if (props.tryOnCategory === 'necklace') return 'Use a clear photo where your neck and upper chest are visible.'
  if (props.tryOnCategory === 'bottom') return 'Use a full-body or lower-body photo where your waist and legs are clearly visible.'
  if (props.tryOnCategory === 'bag') return 'Use a clear upper- or full-body photo with at least one arm and your side visible.'
  return 'Use a clear full-body or upper-body photo depending on the garment. Natural lighting works best.'
})

async function handleFile(file?: File) {
  error.value = ''
  if (!file) return
  if (!await initializeAuth()) {
    await router.push({ path:'/auth', query:{ redirect:route.fullPath } })
    return
  }
  if (!consent.value) { error.value = 'Please confirm consent before uploading your photo.'; return }
  if (!file.type.startsWith('image/')) { error.value = 'Choose an image file.'; return }
  if (file.size > 10 * 1024 * 1024) { error.value = 'Please use an image under 10 MB.'; return }
  await shopper.setPhoto(file, props.merchantId || '', props.tryOnCategory)
  if (props.merchantId) await trackEvent('photo_uploaded', { merchantId:props.merchantId, sessionId:shopper.sessionId, productId:props.productId, metadata:{ tryOnCategory:props.tryOnCategory, assessment:shopper.photoAssessment } })
}

</script>
<template>
  <section class="rounded-[1.5rem] border border-line bg-white p-4 sm:p-5">
    <div v-if="shopper.imageUrl" class="space-y-4">
      <div class="overflow-hidden rounded-[1.2rem] bg-cream"><img :src="shopper.imageUrl" alt="Your uploaded try-on photo" class="max-h-[58vh] w-full object-contain" /></div>
      <div v-if="shopper.photoAssessment" class="rounded-[1.1rem] border border-line bg-paper p-3">
        <div class="flex items-center justify-between gap-3"><p class="text-xs font-semibold">Photo preflight</p><span class="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold">{{ shopper.photoAssessment.score }}%</span></div>
        <div class="mt-3 space-y-2">
          <div v-for="check in shopper.photoAssessment.checks" :key="check.label" class="flex gap-2 text-xs leading-5">
            <span :class="check.status==='pass'?'text-green-700':'text-amber-700'">{{ check.status==='pass'?'✓':'!' }}</span>
            <div><span class="font-medium">{{ check.label }}.</span> <span class="text-muted">{{ check.detail }}</span></div>
          </div>
        </div>
        <p class="mt-2 text-[10px] leading-4 text-muted">This is a basic framing/resolution check. Mirror still relies on the image model for visual understanding.</p>
      </div>
      <div class="rounded-[1.1rem] border border-line bg-paper p-3 text-xs leading-5"><p class="font-semibold">Active base photo ✓</p><p class="text-muted">Mirror will use this photo automatically for new try-ons in this store.</p></div>
      <div class="flex gap-2"><AppButton variant="outline" class="flex-1" @click="input?.click()">Use another photo</AppButton><AppButton variant="ghost" @click="shopper.clearPhoto(props.merchantId)">Remove photo</AppButton></div>
    </div>
    <div v-else class="py-6 text-center sm:py-10">
      <div class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-cream text-xl">↥</div>
      <h2 class="font-semibold">Choose your base photo</h2>
      <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{{ photoGuidance }}</p>
      <div class="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <AppButton :disabled="!consent || shopper.uploading" @click="input?.click()">{{ shopper.uploading ? 'Uploading…' : 'Choose photo' }}</AppButton>
      </div>
      <p v-if="!consent" class="mt-2 text-xs text-muted">Confirm consent below to enable upload.</p>
      <p class="mx-auto mt-4 max-w-sm text-xs leading-5 text-muted">Once uploaded, Mirror uses this photo automatically until you replace or remove it in Photo settings.</p>
    </div>
    <input ref="input" type="file" accept="image/*" capture="environment" class="hidden" @change="handleFile(($event.target as HTMLInputElement).files?.[0])" />
    <label class="mt-4 flex items-start gap-3 border-t border-line pt-4 text-xs leading-5 text-muted"><input v-model="consent" type="checkbox" class="mt-1 h-4 w-4 accent-black" /><span>I consent to Mirror processing this photo to generate virtual try-on images and personalized fashion recommendations. <RouterLink to="/privacy" class="font-medium text-ink underline">Privacy details</RouterLink>.</span></label>
    <p v-if="error" class="mt-3 text-xs font-medium text-red-700">{{ error }}</p>
  </section>
</template>
