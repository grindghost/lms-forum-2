import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useForumStore = defineStore('forum', () => {
  const config = ref<any>(null)
  const currentUser = ref<{ email: string }>({ email: 'admin@example.com' })
  const hoveredPostId = ref<string | null>(null)

  const isAdmin = () => config.value?.adminEmail === currentUser.value.email

  const setHoveredPost = (postId: string | null) => {
    hoveredPostId.value = postId
  }

  const loadConfig = async () => {
    const res = await fetch('/forum.config.json')
    config.value = await res.json()
  }

  return {
    config,
    currentUser,
    isAdmin,
    loadConfig,
    hoveredPostId,
    setHoveredPost
  }
})
