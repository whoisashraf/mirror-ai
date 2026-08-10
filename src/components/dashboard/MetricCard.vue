<script setup lang="ts">defineProps<{ label:string; value:string|number; note?:string }>()</script>
<template><div class="rounded-[1.2rem] border border-line bg-white p-4"><p class="text-xs font-medium text-muted">{{ label }}</p><p class="mt-3 text-2xl font-semibold tracking-tight">{{ value }}</p><p v-if="note" class="mt-2 text-xs text-muted">{{ note }}</p></div></template>
