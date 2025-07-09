import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useForumStore = defineStore('forum', () => {
  const config = ref<any>(null)
  const currentUser = ref<{ email: string }>({ email: 'guest@example.com' })

  const isAdmin = () => config.value?.adminEmail === currentUser.value.email

  const loadConfig = async () => {
    const res = await fetch('/forum.config.json')
    config.value = await res.json()
  }

  return {
    config,
    currentUser,
    isAdmin,
    loadConfig
  }
})
