<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div class="flex items-start gap-4">
          <!-- Warning Icon -->
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span class="text-yellow-600 text-lg">⚠️</span>
            </div>
          </div>
          
          <!-- Content -->
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {{ $t('home.confirmDeleteTitle') }}
            </h3>
            <p class="text-gray-600 mb-4">
              {{ $t('home.confirmDeleteMessage') }}
            </p>
            <p class="text-sm text-gray-500 mb-4 p-3 bg-gray-100 rounded-md">
              <strong>{{ threadTitle }}</strong>
            </p>
            <p class="text-sm text-gray-500 mb-4">
              {{ $t('home.confirmDeleteWarning') }}
            </p>
            
            <!-- Action Buttons -->
            <div class="flex gap-3 justify-end">
              <button
                class="btn btn-outline"
                @click="$emit('cancel')"
              >
                {{ $t('home.cancel') }}
              </button>
              <button
                class="btn btn-error"
                @click="$emit('confirm')"
              >
                {{ $t('home.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import { useI18n } from 'vue-i18n'

const { t: $t } = useI18n()

defineProps({
  show: {
    type: Boolean,
    default: false
  },
  threadTitle: {
    type: String,
    default: ''
  }
})

defineEmits(['cancel', 'confirm'])
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