<template>
  <div class="min-h-screen flex flex-col">
    <Header />
    <!-- Main content with top padding to avoid header overlap -->
    <div class="flex-1 flex flex-col">
      <router-view />
    </div>
    <Footer />
  </div>
</template>

<script setup>
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
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
