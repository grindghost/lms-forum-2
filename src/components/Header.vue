<template>
  <header class="bg-white w-full flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.10)] z-20 fixed top-0 left-0 pr-12 h-[84px]">
    <div class="flex items-center gap-4 overflow-hidden h-full">
      <!-- Brio Logo and Chevron (clickable) -->
      <div
        class="flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.15)] pl-[16px] pr-[24px] pt-[22px] pb-[22px] cursor-pointer select-none"
        @click="goToCallback"
      >
        <!-- Chevron Icon -->
        <img :src="chevronUrl" alt="Back" class="w-4 h-4 text-blue-600" />
        <!-- Brio Logo -->
        <img :src="logoUrl" alt="Brio Logo" class="h-10" />
      </div>
      <!-- Title (clickable) -->
      <h1
        class="text-3xl font-bold text-base-content font-sans tracking-tight select-none cursor-pointer"
        @click="goHome"
      >
        {{ t('header.title') }}
      </h1>
    </div>
    <!-- Mon espace Brio link with yellow top border on hover -->
    <div class="group relative transition h-full flex items-center">
      <a
        href="https://www.brioeducation.ca/mon-espace-brio/tableau-bord/"
        target="_blank"
        rel="noopener"
        class="font-semibold text-base-content text-md px-3 py-1 block"
      >
        {{ t('header.myBrioSpace') }}
      </a>
      <div class="absolute left-0 right-0 top-0 h-[5px] bg-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
    </div>
  </header>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useForumStore } from '@/stores/forumStore'
import chevronUrl from '@/assets/chevron.svg'
import logoUrl from '@/assets/header-logo.svg'

const { t } = useI18n()
const router = useRouter()
const store = useForumStore()

function goToCallback() {
  if (store.config?.callbackURL) {
    window.location.href = store.config.callbackURL
  }
}

function goHome() {
  router.push('/')
}
</script>

<style scoped>
</style> 