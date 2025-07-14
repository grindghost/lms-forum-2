import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useForumStore = defineStore('forum', () => {
  const config = ref(null)
  const currentUser = ref({})
  const groupId = ref('default')
  const hoveredPostId = ref(null)

  const charLimit = computed(() => config.value?.charLimit ?? 4000)

  const isAdmin = () => {
    return config.value && currentUser.value.email === config.value.admin?.email
  }

  const setHoveredPost = (postId) => {
    hoveredPostId.value = postId
  }

  const loadConfig = async () => {
    try {
      
      const baseUrl = new URL('.', window.location.href).toString()
      const configUrl = baseUrl + 'forum.config.json'
      console.log('Loading config from:', configUrl)

      const res = await fetch(configUrl)
      config.value = await res.json()
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const initFromLMS = async () => {
    const fallbackUser = {
      email: 'bouli@example.com',
      name: 'Guest User'
    }
    const fallbackGroupId = 'default-group'

    // Wait for config to be loaded if not already
    if (!config.value) {
      await loadConfig()
    }

    let detectedUser = fallbackUser
    let extractedGroupId = fallbackGroupId

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

      detectedUser = { email, name }
      const activityId = lrs.activity_id || ''
      extractedGroupId = activityId.includes('-') ? activityId.split('-')[0] : fallbackGroupId
    }

    // If detected user is admin, use admin object from config
    if (
      config.value &&
      config.value.admin &&
      detectedUser.email === config.value.admin.email
    ) {
      currentUser.value = {
        name: config.value.admin.name,
        email: config.value.admin.email,
        title: config.value.admin.title
      }
    } else {
      currentUser.value = detectedUser
    }
    groupId.value = extractedGroupId

    console.log('✅ User loaded:', currentUser.value)
    console.log('📦 Group ID set to:', groupId.value)
  }

  return {
    config,
    currentUser,
    groupId,
    hoveredPostId,
    isAdmin,
    loadConfig,
    initFromLMS,
    setHoveredPost,
    charLimit
  }
})
