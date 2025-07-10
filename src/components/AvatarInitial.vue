<template>
  <div class="avatar placeholder w-6 h-6 shrink-0">
    <div class="bg-[#051424] text-neutral-content rounded-full w-10 flex items-center justify-center">
      <span class="text-sm font-fraunces font-medium select-none">
        {{ initial }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  name: {
    type: String,
    required: true
  }
})
const initial = computed(() => props.name?.charAt(0)?.toUpperCase() || '?')
</script> 