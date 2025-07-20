<template>
  <header class="bg-white w-full flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.10)] z-20 fixed top-0 left-0 h-[72px] md:h-[84px] pr-4 md:pr-12">
    <!-- Mobile: Hamburger or Close icon on the left -->
    <div class="flex md:hidden h-full">
      <button @click="showMenu = !showMenu" class="h-full w-14 flex items-center justify-center bg-gray-800">
        <template v-if="!showMenu">
          <!-- Hamburger Icon (SVG) -->
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </template>
        <template v-else>
          <!-- Close Icon (SVG) -->
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </template>
      </button>
    </div>
    <!-- Logo + Title Block (centered on mobile, left on desktop) -->
    <div class="flex pr-10 md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 overflow-hidden h-full w-full md:w-auto">
      <!-- Logo Block -->
      <div class="flex items-center gap-2 relative pl-4 pr-4 md:pl-[16px] md:pr-[24px] pt-4 pb-4 md:pt-[22px] md:pb-[22px] cursor-pointer select-none"
        @click="goToCallback">
        <img :src="chevronUrl" alt="Back" class="w-4 h-4 text-blue-600" />
        <img :src="logoUrl" alt="Brio Logo" class="h-8 md:h-10" />
        <!-- Short right border for mobile only -->
        <div class="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-10 bg-gray-200"></div>
        <div class="block md:hidden absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-gray-500"></div>
      </div>
      <!-- Title -->
      <h1
        class="text-xl md:text-3xl font-bold text-base-content font-sans tracking-tight select-none cursor-pointer"
        @click="goHome"
      >
        {{ t('header.title') }}
      </h1>
    </div>
    <!-- Desktop: Mon espace Brio link -->
    <div class="group relative transition h-full items-center hidden md:flex">
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
    <!-- Mobile: Slide-in overlay menu (appears just under the header) -->
    <transition name="fade">
      <div v-if="showMenu" class="fixed left-0 right-0" :style="{ top: headerTop, zIndex: 40, display: 'flex' }">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-gray-800" @click="showMenu = false" :style="{ top: headerTop }"></div>
        <!-- Side menu -->
        <nav class="relative z-50 w-4/5 max-w-xs" :style="{ height: `calc(100vh - ${headerTop})` } + ' bg-gray-800 flex flex-col'">
          <!-- Navigation links -->
          <ul class="flex-1 flex flex-col gap-2 mt-6">
            <li v-for="item in menuItems" :key="item.text">
              <a :href="item.href" :target="item.external ? '_blank' : undefined" :rel="item.external ? 'noopener' : undefined"
                class="flex items-center px-6 py-3 text-lg font-semibold text-white hover:bg-gray-800 border-l-4"
                :class="item.active ? 'border-yellow-400 bg-gray-800' : 'border-transparent'"
                @click="showMenu = false"
              >
                <span>{{ item.text }}</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </transition>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useForumStore } from '@/stores/forumStore'
import chevronUrl from '@/assets/chevron.svg'
import logoUrl from '@/assets/header-logo.svg'

const { t } = useI18n()
const router = useRouter()
const store = useForumStore()

const showMenu = ref(false)

// Example menu items (customize as needed)
const menuItems = [
  { text: 'Accueil', href: '#', active: true },
  { text: 'Apprenant', href: '#', active: false },
  { text: 'Enseignant', href: '#', active: false },
  { text: 'Administrateur', href: '#', active: false },
  { text: 'Contactez-nous', href: '#', active: false },
  { text: t('header.myBrioSpace'), href: 'https://www.brioeducation.ca/mon-espace-brio/tableau-bord/', external: true, active: false },
]

function goToCallback() {
  if (store.config?.callbackURL) {
    window.location.href = store.config.callbackURL
  }
}

function goHome() {
  router.push('/')
}

// --- Fix for window.innerWidth in template ---
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

function updateWindowWidth() {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', updateWindowWidth)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth)
})

const headerTop = computed(() => (windowWidth.value >= 768 ? '84px' : '72px'))
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style> 