<template>
  <div>
    <header class="w-full flex items-center justify-between px-6 py-6 bg-white shadow fixed top-0 left-0 z-10 pointer-events-auto">
      <div class="flex items-center gap-4">
        <!-- Logo -->
        <img
          src="@/assets/header-logo.svg"
          alt="Forum Logo"
          class="w-[6rem] cursor-pointer"
          @click="goToCallback"
        />

        <!-- Separator -->
        <div class="h-10 w-px bg-gray-200"></div>

        <!-- Title -->
        <h1
          class="text-3xl font-[600] font-overpass tracking-tight cursor-pointer pointer-events-auto text-base-content mt-2"
          @click="goHome"
        >
          {{ $t('header.title') }}
        </h1>
      </div>
      
      <!-- Language Switcher -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">{{ $t('header.language') }}:</span>
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-sm btn-outline">
            {{ currentLocale === 'en' ? '🇺🇸 EN' : '🇫🇷 FR' }}
          </div>
          <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
            <li><a @click="changeLanguage('en')" class="cursor-pointer">🇺🇸 English</a></li>
            <li><a @click="changeLanguage('fr')" class="cursor-pointer">🇫🇷 Français</a></li>
          </ul>
        </div>
      </div>
    </header>

    <!-- Main content with top padding to avoid header overlap -->
    <div class="">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useForumStore } from '@/stores/forumStore'
import { setLocale } from '@/i18n'

const store = useForumStore()
const router = useRouter()
const { locale } = useI18n()

const currentLocale = computed(() => locale.value)

onMounted(async () => {
  await store.loadConfig()
  await store.initFromLMS()

  if (router.currentRoute.value.fullPath === '/index.html') {
    router.replace('/') // or whatever your homepage route is
  }

})

async function goToCallback() {
  if (!store.config?.callbackURL) {
    await store.loadConfig()
  }
  if (store.config?.callbackURL) {
    window.location.href = store.config.callbackURL
  }
}

function goHome() {
  router.push('/')
}

function changeLanguage(lang) {
  setLocale(lang)
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Gabarito:wght@400..900&family=Inter:wght@100..900&family=Nunito:ital,wght@0,200..1000;1,200..1000&family=Overpass:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Sen:wght@400..800&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap');

.font-overpass {
  font-family: 'Overpass', sans-serif;
}
.font-sans {
  font-family: 'Source Sans Pro', sans-serif;
}
</style>
