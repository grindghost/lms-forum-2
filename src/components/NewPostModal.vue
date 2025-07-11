<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-30 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg relative">
        <h2 class="text-xl font-bold font-overpass mb-4">{{ $t('thread.postReply') }}</h2>
        <div class="max-h-[350px] overflow-y-auto mb-4">
          <component :is="RichEditor" v-model="content" :placeholder="$t('thread.writeMessage')" :charLimit="charLimit" />
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button class="btn btn-outline" @click="$emit('cancel')">
            {{ $t('thread.cancel') }}
          </button>
          <button class="btn btn-primary" @click="$emit('confirm')">
            {{ $t('thread.send') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t: $t } = useI18n()

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  content: {
    type: String,
    default: ''
  },
  RichEditor: {
    type: Object,
    required: true
  },
  /**
   * charLimit: Maximum number of characters allowed in the post.
   */
  charLimit: {
    type: Number,
    default: 4000
  }
})

const emit = defineEmits(['cancel', 'confirm', 'update:content'])

const content = computed({
  get: () => props.content,
  set: (val) => emit('update:content', val)
})
</script>

<style scoped>
/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from {
  opacity: 0;
  backdrop-filter: blur(0px);
}

.modal-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}

.modal-enter-to,
.modal-leave-from {
  opacity: 1;
  backdrop-filter: blur(4px);
}
</style> 