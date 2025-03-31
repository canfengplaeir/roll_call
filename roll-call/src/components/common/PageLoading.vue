<script setup lang="ts">
defineProps<{
  message?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[400px]">
    <div class="loading loading-spinner loading-lg text-primary"></div>
    <p v-if="message" class="mt-4 text-base-content/70">{{ message }}</p>
  </div>
</template> 