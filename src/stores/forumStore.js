import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useForumStore = defineStore('forum', () => {
  const config = ref(null)
  const currentUser = ref({})
  const groupId = ref('default')
  const hoveredPostId = ref(null)

  const isAdmin = () => {
    return config.value && currentUser.value.email === config.value.admin?.email
  }

  const setHoveredPost = (postId) => {
    hoveredPostId.value = postId
  }

  const loadConfig = async () => {
    try {
      const res = await fetch('/forum.config.json')
      config.value = await res.json()
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const initFromLMS = async () => {
    const fallbackUser = {
      email: 'guest@example.com',
      name: 'Guest User'
    }
    const fallbackGroupId = 'default-group'

    if (window.ADL && ADL.XAPIWrapper && ADL.XAPIWrapper.lrs) {
      const lrs = ADL.XAPIWrapper.lrs
      let actor = lrs.actor

      if (typeof actor === 'string') {
        try {
          actor = JSON.parse(actor)
        } catch (e) {
          console.warn('Could not parse actor JSON:', e)
          actor = {}
        }
      }

      if (!actor || typeof actor !== 'object') {
        actor = {}
      }

      const email = actor && actor.mbox ? actor.mbox.replace('mailto:', '') : fallbackUser.email
      const name = actor && actor.name ? actor.name.replace(/\+/g, ' ') : fallbackUser.name

      const activityId = lrs.activity_id || ''
      const extractedGroupId = activityId.includes('-') ? activityId.split('-')[0] : fallbackGroupId

      currentUser.value = { email, name }
      groupId.value = extractedGroupId

      console.log('✅ LMS user loaded:', currentUser.value)
      console.log('📦 Group ID set to:', groupId.value)
      console.log('🔍 Activity ID was:', lrs.activity_id)
    } else {
      currentUser.value = fallbackUser
      groupId.value = fallbackGroupId
      console.warn('⚠️ No LMS context detected. Using fallback user and group.')
    }
  }

  return {
    config,
    currentUser,
    groupId,
    hoveredPostId,
    isAdmin,
    loadConfig,
    initFromLMS,
    setHoveredPost
  }
})
