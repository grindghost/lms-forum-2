<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase'
import { push, ref as dbRef, serverTimestamp, onValue, update, remove, get } from 'firebase/database'
import { useForumStore } from '@/stores/forumStore'
import { encryptText, decryptText } from '@/utils/encryption'
import { formatDate, formatDateShort, formatDateRelative } from '@/utils/dateFormat'
import { useI18n } from 'vue-i18n'

const { t: $t, locale } = useI18n()

const store = useForumStore()
const newTitle = ref('')
const threads = ref([])
const router = useRouter()

// Computed property for formatted dates that reacts to locale changes
const formatThreadDate = (date) => {
  if (!date) return $t('home.pending')
  return formatDate(date, locale.value)
}

// Thread editing state
const editingThreadId = ref(null)
const editingThreadTitle = ref('')

// Confirmation modal state
const showDeleteConfirm = ref(false)
const threadToDelete = ref(null)

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

  const encryptedAuthor = encryptText(store.currentUser.email)

  await push(dbRef(db, 'threads'), {
    title: newTitle.value,
    createdAt: serverTimestamp(),
    author: encryptedAuthor,
    group: store.config.group
  })

  newTitle.value = ''
}

// Edit thread functions
const startEditingThread = (thread) => {
  editingThreadId.value = thread.id
  editingThreadTitle.value = thread.title
}

const cancelEditThread = () => {
  editingThreadId.value = null
  editingThreadTitle.value = ''
}

const saveEditThread = async (threadId) => {
  if (!editingThreadTitle.value.trim()) return
  
  await update(dbRef(db, `threads/${threadId}`), {
    title: editingThreadTitle.value.trim()
  })
  
  editingThreadId.value = null
  editingThreadTitle.value = ''
}

// Delete thread functions
const confirmDeleteThread = (thread) => {
  threadToDelete.value = thread
  showDeleteConfirm.value = true
}

const cancelDeleteThread = () => {
  showDeleteConfirm.value = false
  threadToDelete.value = null
}

const deleteThread = async () => {
  if (!threadToDelete.value) return
  
  try {
    // Delete the thread
    await remove(dbRef(db, `threads/${threadToDelete.value.id}`))
    
    // Delete all posts in this thread
    const postsRef = dbRef(db, 'posts')
    const postsSnapshot = await get(postsRef)
    const allPosts = postsSnapshot.val() || {}
    
    const deletePromises = []
    Object.entries(allPosts).forEach(([postId, post]) => {
      if (post.threadId === threadToDelete.value.id) {
        deletePromises.push(remove(dbRef(db, `posts/${postId}`)))
      }
    })
    
    await Promise.all(deletePromises)
    
    showDeleteConfirm.value = false
    threadToDelete.value = null
  } catch (error) {
    console.error('Error deleting thread:', error)
  }
}

// Load threads and posts once config is ready
watch(
  () => store.config,
  (config) => {
    if (!config?.group) return

    const groupId = config.group

    // Load threads
    onValue(dbRef(db, 'threads'), (threadSnapshot) => {
      const allThreads = threadSnapshot.val() || {}

      // Load posts to count messages per thread
      onValue(dbRef(db, 'posts'), (postSnapshot) => {
        const allPosts = postSnapshot.val() || {}
        
        // Count posts per thread
        const postCounts = {}
        Object.values(allPosts).forEach(post => {
          if (post.threadId) {
            postCounts[post.threadId] = (postCounts[post.threadId] || 0) + 1
          }
        })

        threads.value = Object.entries(allThreads)
          .map(([id, thread]) => ({ 
            id, 
            ...thread, 
            messageCount: postCounts[id] || 0 
          }))
          .filter((t) => t.group === groupId)
          .sort((a, b) => b.createdAt - a.createdAt)
      })
    })
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-screen bg-[#f4f6f8] font-sans pt-24">
    <main class="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div v-if="store.isAdmin()" class="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          v-model="newTitle"
          :placeholder="$t('home.threadTitle')"
          class="input input-bordered w-full"
        />
        <button class="btn btn-primary w-full sm:w-auto" @click="createThread">
          {{ $t('home.createThread') }}
        </button>
      </div>

      <h1 class="text-2xl font-bold text-base-content font-overpass border-b pb-2">
        {{ $t('home.forumThreads') }}
      </h1>

      <div v-if="threads.length === 0" class="text-center text-gray-500 mt-8">
        {{ $t('home.noThreads') }}
      </div>
      

      <div class="grid gap-4">
        <div
          v-for="thread in threads"
          :key="thread.id"
          class="rounded-lg bg-base-100 shadow hover:shadow-md transition-all duration-200 border border-base-300 hover:border-primary cursor-pointer"
          @click="goToThread(thread.id)"
        >
          <div class="card-body">
            <!-- Thread Title Section -->
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div v-if="editingThreadId === thread.id" class="flex items-center gap-2" @click.stop>
                  <input
                    v-model="editingThreadTitle"
                    class="input input-bordered input-sm flex-1"
                    @keyup.enter="saveEditThread(thread.id)"
                    @keyup.esc="cancelEditThread"
                    ref="editInput"
                  />
                  <button class="btn btn-sm btn-primary" @click="saveEditThread(thread.id)">
                    {{ $t('home.save') }}
                  </button>
                  <button class="btn btn-sm btn-outline" @click="cancelEditThread">
                    {{ $t('home.cancel') }}
                  </button>
                </div>
                <h2 v-else class="card-title font-overpass font-[400]">
                  {{ thread.title }}
                  <div class="badge badge-primary badge-outline">
                    {{ thread.messageCount }} {{ $t('home.messages') }}
                  </div>
                </h2>
              </div>
              
              <!-- Admin Actions -->
              <div v-if="store.isAdmin()" class="flex gap-2 ml-4" @click.stop>
                <button
                  v-if="editingThreadId !== thread.id"
                  class="btn btn-sm btn-outline"
                  @click="startEditingThread(thread)"
                  title="Edit thread title"
                >
                  ✏️
                </button>
                <button
                  v-if="editingThreadId !== thread.id"
                  class="btn btn-sm btn-outline btn-error"
                  @click="confirmDeleteThread(thread)"
                  title="Delete thread"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div class="flex items-center text-sm text-gray-500 gap-3 mt-1">
              <div class="avatar placeholder">
                <div class="bg-neutral-focus text-neutral-content rounded-full w-6 h-6">
                  <span class="text-xs font-fraunces font-extrabold">
                    {{ decryptText(thread.author).charAt(0).toUpperCase() }}
                  </span>
                </div>
              </div>

              <span class="truncate max-w-[160px]">
                {{ decryptText(thread.author) }}
              </span>

              <span>•</span>
              <span>
                {{ formatThreadDate(thread.createdAt) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div class="flex items-start gap-4">
          <!-- Warning Icon -->
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span class="text-yellow-600 text-lg">⚠️</span>
            </div>
          </div>
          
          <!-- Content -->
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {{ $t('home.confirmDeleteTitle') }}
            </h3>
            <p class="text-gray-600 mb-4">
              {{ $t('home.confirmDeleteMessage') }}
            </p>
            <p class="text-sm text-gray-500 mb-4">
              {{ $t('home.confirmDeleteWarning') }}
            </p>
            
            <!-- Action Buttons -->
            <div class="flex gap-3 justify-end">
              <button
                class="btn btn-outline"
                @click="cancelDeleteThread"
              >
                {{ $t('home.cancel') }}
              </button>
              <button
                class="btn btn-error"
                @click="deleteThread"
              >
                {{ $t('home.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Gabarito:wght@400..900&family=Inter:wght@100..900&family=Nunito:ital,wght@0,200..1000;1,200..1000&family=Overpass:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Sen:wght@400..800&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap');

.font-overpass {
  font-family: 'Overpass', sans-serif;
}
.font-sans {
  font-family: 'Source Sans Pro', sans-serif;
}
</style>
