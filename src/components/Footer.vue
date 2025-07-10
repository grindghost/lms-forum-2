<template>
  <footer class="bg-[#0f263e] pt-10 pb-0 text-white relative">
    <div class="max-w-6xl mx-auto px-4 flex flex-col md:flex-row md:justify-between gap-8">
      <!-- Menu Columns -->
      <div class="flex flex-col md:flex-row gap-12 w-full">
        <!-- Brio -->
        <div>
          <h3 class="font-bold mb-2 text-lg">{{ t('footer.brio') }}</h3>
          <ul class="space-y-1">
            <li><a href="https://www.brioeducation.ca/a-propos/" target="_blank" rel="noopener" class="underline hover:text-blue-200">{{ t('footer.about') }}</a></li>
            <li><a href="https://aide.brioeducation.ca/nous-joindre/" target="_blank" rel="noopener" class="underline hover:text-blue-200">{{ t('footer.contact') }}</a></li>
          </ul>
        </div>
        <!-- Aide -->
        <div>
          <h3 class="font-bold mb-2 text-lg">{{ t('footer.help') }}</h3>
          <ul class="space-y-1">
            <li><a href="https://aide.brioeducation.ca/" target="_blank" rel="noopener" class="underline hover:text-blue-200">{{ t('footer.helpCenter') }}</a></li>
            <li><a href="https://aide.brioeducation.ca/accessibilite-web/" target="_blank" rel="noopener" class="underline hover:text-blue-200">{{ t('footer.accessibility') }}</a></li>
          </ul>
        </div>
        <!-- Mentions légales -->
        <div>
          <h3 class="font-bold mb-2 text-lg">{{ t('footer.legal') }}</h3>
          <ul class="space-y-1">
            <li><a href="https://www.brioeducation.ca/a-propos/#" target="_blank" rel="noopener" class="underline hover:text-blue-200">{{ t('footer.terms') }}</a></li>
            <li><a href="https://www.brioeducation.ca/a-propos/#" target="_blank" rel="noopener" class="underline hover:text-blue-200">{{ t('footer.privacy') }}</a></li>
          </ul>
        </div>
      </div>
      <!-- Language Button -->
      <div class="flex items-start md:items-center justify-end md:justify-end w-full md:w-auto">
        <button
          @click="toggleLanguage"
          class="flex items-center gap-2 border border-white rounded-md px-4 pr-10 py-2 text-white hover:bg-white/10 transition font-medium"
        >
          <img :src="planetUrl" alt="" class="w-5 h-5" />
          <span class="ml-1">{{ currentLocale === 'fr' ? 'English' : 'Français' }}</span>
        </button>
      </div>
    </div>
    <!-- Bottom Bar -->
    <div class="bg-[#051424] text-gray-200 text-center py-3 mt-16 text-sm">
      Brio, une initiative de
      <a href="https://www.ulaval.ca/" target="_blank" rel="noopener" class="underline hover:text-blue-200">l'Université Laval</a>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import planetUrl from '@/assets/planet.svg'

const { locale, t } = useI18n()
const currentLocale = computed(() => locale.value)

function toggleLanguage() {
  setLocale(currentLocale.value === 'fr' ? 'en' : 'fr')
}
</script> 