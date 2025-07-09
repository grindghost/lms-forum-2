import { createI18n } from 'vue-i18n'
import en from '../locales/en.json'
import fr from '../locales/fr.json'

const messages = {
  en,
  fr
}

export const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: localStorage.getItem('locale') || 'fr', // Default language
  fallbackLocale: 'en',
  messages
})

export function setLocale(locale) {
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
}