<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
}>();

const toggleMenu = () => {
  emit('update:isOpen', !props.isOpen);
};
</script>

<template>
  <button
    class="p-2 rounded-lg focus:outline-none lg:hidden"
    @click="toggleMenu"
    :aria-expanded="isOpen"
    aria-label="导航菜单"
  >
    <span class="sr-only">{{ isOpen ? '关闭菜单' : '打开菜单' }}</span>
    <div class="w-6 h-5 flex flex-col justify-between relative">
      <span 
        class="block h-0.5 w-full bg-current rounded transform transition duration-300"
        :class="isOpen ? 'rotate-45 translate-y-2' : ''"
      ></span>
      <span 
        class="block h-0.5 w-full bg-current rounded transform transition duration-300"
        :class="isOpen ? 'opacity-0' : 'opacity-100'"
      ></span>
      <span 
        class="block h-0.5 w-full bg-current rounded transform transition duration-300"
        :class="isOpen ? '-rotate-45 -translate-y-2' : ''"
      ></span>
    </div>
  </button>
</template> 