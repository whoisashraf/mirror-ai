<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'solid'|'outline'|'ghost'; type?: 'button'|'submit'; disabled?: boolean }>(), { variant:'solid', type:'button' })
</script>
<template>
  <button :type="type" :disabled="disabled" class="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50" :class="variant === 'solid' ? 'bg-ink text-white hover:bg-black' : variant === 'outline' ? 'border border-ink bg-transparent text-ink hover:bg-white' : 'bg-transparent text-ink hover:bg-black/5'">
    <slot />
  </button>
</template>
