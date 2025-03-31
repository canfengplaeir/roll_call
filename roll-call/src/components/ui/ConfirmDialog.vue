<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

const dialogProps = withDefaults(defineProps<Props>(), {
  title: '',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  type: 'warning' as const
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const dialogRef = ref<HTMLDialogElement | null>(null);

const show = () => {
  if (dialogRef.value) {
    dialogRef.value.showModal();
  }
};

const hide = () => {
  if (dialogRef.value) {
    dialogRef.value.close();
  }
};

const handleConfirm = () => {
  emit('confirm');
  hide();
};

const handleCancel = () => {
  emit('cancel');
  hide();
};

// 暴露方法给父组件
defineExpose({
  show,
  hide
});

// 添加图标和样式映射
const typeIcons = {
  'warning': 'ph:warning-circle-fill',
  'error': 'ph:x-circle-fill',
  'success': 'ph:check-circle-fill',
  'info': 'ph:info-fill'
} as const;

const typeColors = {
  'warning': 'text-warning',
  'error': 'text-error',
  'success': 'text-success',
  'info': 'text-info'
} as const;

const typeButtonClasses = {
  'warning': 'btn-warning',
  'error': 'btn-error',
  'success': 'btn-success',
  'info': 'btn-info'
} as const;
</script>

<template>
  <dialog ref="dialogRef" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg flex items-center">
        <i-iconify 
          :icon="typeIcons[dialogProps.type]" 
          class="mr-2 text-xl"
          :class="typeColors[dialogProps.type]"
        />
        {{ dialogProps.title }}
      </h3>
      <p class="py-4">{{ dialogProps.message }}</p>
      <div class="modal-action">
        <button 
          class="btn btn-ghost" 
          @click="handleCancel"
        >
          {{ dialogProps.cancelText }}
        </button>
        <button 
          class="btn" 
          :class="typeButtonClasses[dialogProps.type]"
          @click="handleConfirm"
        >
          {{ dialogProps.confirmText }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template> 