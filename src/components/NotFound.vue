<template>
  <div class="max-w-2xl mx-auto py-24 text-center flex flex-col items-center justify-center min-h-[40vh]">
    <h1 class="text-3xl font-bold mb-4">{{ $t('notFound.title') }}</h1>
    <p class="text-lg text-gray-500 mb-8">
      {{ $t('notFound.message') }}
    </p>
    <router-link to="/" class="btn btn-primary">{{ $t('notFound.goHome') }}</router-link>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t: $t } = useI18n()
</script> 