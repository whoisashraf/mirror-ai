<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const returnTo = computed(() => {
  const requested = typeof route.query.return === 'string' ? route.query.return : ''
  return requested.startsWith('/') && !requested.startsWith('//') && !requested.startsWith('/privacy') ? requested : '/'
})
</script>

<template><main class="mx-auto max-w-2xl px-5 py-12"><RouterLink :to="returnTo" class="text-sm font-medium">← Back</RouterLink><h1 class="mt-10 text-4xl font-semibold tracking-tight">Privacy for try-on photos</h1><div class="mt-8 space-y-6 text-sm leading-7 text-muted"><p>Mirror processes photos you explicitly upload to create virtual try-on images and personalized fashion recommendations.</p><p>When you ask the AI stylist for recommendations, Mirror sends your base photo, current generated look and shortlisted catalogue product images through OpenRouter to the configured Google Gemini model. The stylist uses observable fashion details such as palette, silhouette, proportions and outfit coherence. It is instructed not to infer gender identity or other sensitive identity traits from your appearance; your selected collection provides the styling direction.</p><p>Shopper photos and generated results are stored in private Supabase Storage buckets and accessed through time-limited signed URLs. A retailer does not receive a raw-photo gallery in the Mirror dashboard.</p><p>Your latest uploaded photo becomes the base photo for the current store in this browser. Mirror restores it only when both your account and private fitting session match. Switching accounts clears cached photo and look data before the new profile loads.</p><p>Mirror does not use shopper photos to train its own models. Any provider data handling remains subject to the configured provider agreement for the pilot.</p><p>You can replace or remove your base photo from Photo settings at any time. Removing it also removes generated images linked to that source photo from Mirror storage. Saved browser links to those images will stop working.</p><p>Virtual try-ons are visual approximations and are not guarantees of garment sizing, fit, colour accuracy or material behaviour.</p></div></main></template>
