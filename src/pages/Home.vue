<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase'
import { push, ref as dbRef, serverTimestamp, onValue } from 'firebase/database'
import { useForumStore } from '@/stores/forumStore'

const store = useForumStore()
const newTitle = ref('')
const threads = ref([])
const router = useRouter()

// Load config
onMounted(() => {
  store.loadConfig()
})

// Navigate to thread
const goToThread = (id) => {
  router.push(`/thread/${id}`)
}

// Create new thread
const createThread = async () => {
  if (!newTitle.value.trim() || !store.config?.group) return

  await push(dbRef(db, 'threads'), {
    title: newTitle.value,
    createdAt: serverTimestamp(),
    author: store.currentUser.email,
    group: store.config.group
  })

  newTitle.value = ''
}

// Load threads once config is ready
watch(
  () => store.config,
  (config) => {
    if (!config?.group) return

    const groupId = config.group

    onValue(dbRef(db, 'threads'), (snapshot) => {
      const allThreads = snapshot.val() || {}

      threads.value = Object.entries(allThreads)
        .map(([id, thread]) => ({ id, ...thread }))
        .filter((t) => t.group === groupId)
        .sort((a, b) => b.createdAt - a.createdAt)
    })
  },
  { immediate: true }
)
</script>

<template>
  <div>
    <div v-if="store.isAdmin()" class="mb-6 flex gap-2 items-center">
      <input
        v-model="newTitle"
        placeholder="New thread title..."
        class="input input-bordered w-full max-w-md"
      />
      <button class="btn btn-primary" @click="createThread">Create</button>
    </div>

    <div class="space-y-4">
      <div
        v-for="thread in threads"
        :key="thread.id"
        @click="goToThread(thread.id)"
        class="bg-white p-4 rounded shadow cursor-pointer hover:bg-gray-50"
      >
        <h2 class="text-xl font-bold">{{ thread.title }}</h2>
        <p class="text-sm text-gray-500">
          by {{ thread.author }} •
          {{
            thread.createdAt
              ? new Date(thread.createdAt).toLocaleDateString()
              : 'pending…'
          }}
        </p>
      </div>
    </div>
  </div>
</template>
