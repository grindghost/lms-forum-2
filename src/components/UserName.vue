<template>
  <a
    :href="mailtoLink"
    class="text-base-content/70 font-bold hover:underline hover:text-blue-700 cursor-pointer transition"
    @click.stop
  >
    {{ name }}
  </a>
</template>

<script setup>
const props = defineProps({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  }
})
const mailtoLink = `mailto:${props.email}`
</script> 