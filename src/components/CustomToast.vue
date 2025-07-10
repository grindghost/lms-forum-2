<template>
  <Transition name="toast">
    <div v-if="show" class="custom-toast">
      <div class="toast-content">
        <div class="checkmark">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span class="message">{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { defineProps } from 'vue'

defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.custom-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 9999;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 0.75rem 1.5rem;
  min-width: 300px;
  max-width: 90vw;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.checkmark {
  color: #10b981;
  flex-shrink: 0;
}

.message {
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Toast animation */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(1rem);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(1rem);
}
</style> 