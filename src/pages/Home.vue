<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/firebase'
import { push, ref as dbRef, serverTimestamp, onValue, update, remove, get } from 'firebase/database'
import { useForumStore } from '@/stores/forumStore'
import { encryptText, decryptText, encryptUser, decryptUser } from '@/utils/encryption'
import { formatDate, formatDateShort, formatDateRelative } from '@/utils/dateFormat'
import { useI18n } from 'vue-i18n'
import AvatarInitial from '@/components/AvatarInitial.vue'
import UserName from '@/components/UserName.vue'

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

// Drag and drop state
const draggedThread = ref(null)
const draggedOverThread = ref(null)
const isDragging = ref(false)
const dropPosition = ref(null) // 'above' or 'below'

// Track posts for last poster info
const posts = ref({})

onValue(dbRef(db, 'posts'), (snapshot) => {
  posts.value = snapshot.val() || {}
})

// Helper to get last post info for a thread
function getLastPostInfo(threadId) {
  const threadPosts = Object.values(posts.value).filter(p => p.threadId === threadId && !p.deleted)
  if (threadPosts.length === 0) return null
  const last = threadPosts.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
  return {
    name: decryptUser(last.author).name,
    email: decryptUser(last.author).email,
    date: last.createdAt
  }
}

// Subscribe logic
function isSubscribed(thread) {
  if (!thread.subscribers) return false
  return thread.subscribers.includes(store.currentUser.email)
}
async function toggleSubscribe(thread) {
  const threadRef = dbRef(db, `threads/${thread.id}`)
  const subscribers = Array.isArray(thread.subscribers) ? [...thread.subscribers] : []
  const idx = subscribers.indexOf(store.currentUser.email)
  if (idx === -1) {
    subscribers.push(store.currentUser.email)
  } else {
    subscribers.splice(idx, 1)
  }
  await update(threadRef, { subscribers })
}

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
  if (!newTitle.value.trim() || !store.groupId) return

  console.log('📝 Creating thread:', {
    title: newTitle.value,
    groupId: store.groupId,
    user: store.currentUser
  })

  const encryptedAuthor = encryptUser(store.currentUser)

  await push(dbRef(db, 'threads'), {
    title: newTitle.value,
    createdAt: serverTimestamp(),
    author: encryptedAuthor,
    group: store.groupId,
    sortOrder: Date.now() // Use timestamp as initial sort order
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

const toggleReadOnly = async (threadId, isReadOnly) => {
  try {
    await update(dbRef(db, `threads/${threadId}`), {
      readOnly: isReadOnly
    })
  } catch (error) {
    console.error('Error toggling read-only status:', error)
  }
}

// Drag and drop functions
const handleDragStart = (e, thread) => {
  if (!store.isAdmin()) return
  draggedThread.value = thread
  isDragging.value = true
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/html', '') // Required for Firefox
}

const handleDragOver = (e, thread) => {
  if (!store.isAdmin() || !isDragging.value || draggedThread.value?.id === thread.id) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  draggedOverThread.value = thread
  
  // Determine drop position based on mouse position
  const rect = e.currentTarget.getBoundingClientRect()
  const dropY = e.clientY
  const targetCenterY = rect.top + rect.height / 2
  
  // Use the same logic as in handleDrop
  const currentThreads = [...threads.value]
  const targetIndex = currentThreads.findIndex(t => t.id === thread.id)
  
  let dropAbove
  if (targetIndex === 0) {
    // For the first item, use a larger "drop above" zone (top 60% of the card)
    const topZone = rect.top + rect.height * 0.6
    dropAbove = dropY < topZone
  } else {
    // For other items, use the center line
    dropAbove = dropY < targetCenterY
  }
  
  dropPosition.value = dropAbove ? 'above' : 'below'
}

const handleDragLeave = (e) => {
  if (!store.isAdmin()) return
  draggedOverThread.value = null
  dropPosition.value = null
}

const handleDrop = async (e, targetThread) => {
  if (!store.isAdmin() || !isDragging.value || !draggedThread.value) return
  e.preventDefault()
  
  const draggedThreadId = draggedThread.value.id
  const targetThreadId = targetThread.id
  
  if (draggedThreadId === targetThreadId) return
  
  try {
    // Get current threads to calculate new sort order
    const currentThreads = [...threads.value]
    const draggedIndex = currentThreads.findIndex(t => t.id === draggedThreadId)
    const targetIndex = currentThreads.findIndex(t => t.id === targetThreadId)
    
    console.log('Drop Debug:', {
      draggedThreadId,
      targetThreadId,
      draggedIndex,
      targetIndex,
      currentThreads: currentThreads.map(t => ({ id: t.id, title: t.title }))
    })
    
    if (draggedIndex === -1 || targetIndex === -1) return
    
    // Determine drop position based on mouse position relative to target
    const rect = e.currentTarget.getBoundingClientRect()
    const dropY = e.clientY
    const targetCenterY = rect.top + rect.height / 2
    
    // Use a more intuitive drop detection
    let dropAbove
    if (targetIndex === 0) {
      // For the first item, use a larger "drop above" zone (top 60% of the card)
      const topZone = rect.top + rect.height * 0.6
      dropAbove = dropY < topZone
    } else {
      // For other items, use the center line
      dropAbove = dropY < targetCenterY
    }
    
    console.log('Drop Position:', { dropY, targetCenterY, dropAbove, targetIndex })
    
    // Use a simpler approach: remove and insert
    const newThreads = [...currentThreads]
    const [draggedThread] = newThreads.splice(draggedIndex, 1)
    
    let insertIndex
    if (dropAbove) {
      // Drop above: insert before target
      insertIndex = targetIndex
    } else {
      // Drop below: insert after target
      insertIndex = targetIndex + 1
    }
    
    // Adjust insert index if we removed an item before the target
    if (draggedIndex < targetIndex) {
      insertIndex -= 1
    }
    
    newThreads.splice(insertIndex, 0, draggedThread)
    
    console.log('New Order:', newThreads.map(t => ({ id: t.id, title: t.title })))
    
    // Calculate new sort orders
    const sortOrderStep = 1000 // Gap between sort orders
    const updates = {}
    
    newThreads.forEach((thread, index) => {
      const newSortOrder = (index + 1) * sortOrderStep
      updates[`threads/${thread.id}/sortOrder`] = newSortOrder
    })
    
    console.log('Updates:', updates)
    
    // Update all affected threads
    await update(dbRef(db), updates)
    
  } catch (error) {
    console.error('Error reordering threads:', error)
  } finally {
    // Reset drag state
    draggedThread.value = null
    draggedOverThread.value = null
    isDragging.value = false
    dropPosition.value = null
  }
}

const handleDragEnd = () => {
  if (!store.isAdmin()) return
  draggedThread.value = null
  draggedOverThread.value = null
  isDragging.value = false
  dropPosition.value = null
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

// Load threads and posts once config and groupId are ready
watch(
  () => [store.config, store.groupId],
  ([config, groupId]) => {
    if (!config || !groupId) return

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

        const allThreadsArray = Object.entries(allThreads)
          .map(([id, thread]) => ({ 
            id, 
            ...thread, 
            messageCount: postCounts[id] || 0,
            sortOrder: thread.sortOrder || 0 // Default to 0 for existing threads
          }))
        
        // Filter by groupId
        const filteredThreads = allThreadsArray.filter((t) => t.group === store.groupId)
        
        console.log('🔍 Thread filtering:', {
          totalThreads: allThreadsArray.length,
          groupId: store.groupId,
          filteredCount: filteredThreads.length,
          allGroups: [...new Set(allThreadsArray.map(t => t.group))]
        })
        
        threads.value = filteredThreads.sort((a, b) => {
          // First sort by sortOrder (lower numbers first), then by creation date
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder
          }
          return b.createdAt - a.createdAt
        })
      })
    })
  },
  { immediate: true }
)
</script>

<template>
  <div class="bg-[#f4f6f8] font-sans pt-24 h-full flex-1">
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

      <div class="flex items-center justify-between border-b pb-2">
        <h1 class="text-2xl font-bold text-base-content font-overpass">
          {{ $t('home.forumThreads') }}
        </h1>
        <div class="text-sm text-gray-500">
          {{ $t('home.group') }}: <span class="font-semibold">{{ store.groupId }}</span>
        </div>
      </div>

      <div v-if="threads.length === 0" class="text-center text-gray-500 mt-8">
        {{ $t('home.noThreads') }}
      </div>
      

      <div class="grid gap-4">
        <div
          v-for="thread in threads"
          :key="thread.id"
          class="rounded-lg bg-base-100 shadow hover:shadow-md transition-all duration-200 border border-base-300 hover:border-primary cursor-pointer"
          :class="{
            'opacity-50': isDragging && draggedThread?.id === thread.id,
            'border-dashed border-primary bg-primary/5': draggedOverThread?.id === thread.id,
            'border-t-4 border-t-primary': draggedOverThread?.id === thread.id && dropPosition === 'above',
            'border-b-4 border-b-primary': draggedOverThread?.id === thread.id && dropPosition === 'below'
          }"
          draggable="true"
          @dragstart="handleDragStart($event, thread)"
          @dragover="handleDragOver($event, thread)"
          @dragleave="handleDragLeave($event)"
          @drop="handleDrop($event, thread)"
          @dragend="handleDragEnd"
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
                  <div v-if="store.isAdmin()" class="mr-2 text-gray-400 cursor-grab active:cursor-grabbing" :title="$t('home.dragToReorder')">
                    ⋮⋮
                  </div>
                  {{ thread.title }}
                  <div class="badge badge-primary badge-outline">
                    {{ thread.messageCount }} {{ $t('home.messages') }}
                  </div>
                  <div v-if="thread.readOnly" class="badge badge-warning badge-outline" title="Read-only thread">
                    🔒
                  </div>
                </h2>
              </div>
              
              <!-- Admin Actions -->
              <div v-if="store.isAdmin()" class="flex gap-2 ml-4" @click.stop>
                <div class="flex items-center gap-2">
                  <label class="label cursor-pointer gap-2">
                    <span class="label-text text-xs">{{ $t('home.readOnly') }}</span>
                    <input
                      type="checkbox"
                      :checked="thread.readOnly || false"
                      @change="toggleReadOnly(thread.id, $event.target.checked)"
                      class="checkbox checkbox-xs"
                    />
                  </label>
                </div>
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
              <!-- Subscribe Checkbox -->
              <div class="flex items-center gap-2" @click.stop>
                <input
                  type="checkbox"
                  :checked="isSubscribed(thread)"
                  @change="toggleSubscribe(thread)"
                  class="checkbox checkbox-xs"
                  :id="'subscribe-' + thread.id"
                />
                <label :for="'subscribe-' + thread.id" class="text-xs cursor-pointer">
                  {{ isSubscribed(thread) ? $t('home.unsubscribe') : $t('home.subscribe') }}
                </label>
              </div>
            </div>

            <div class="flex items-center text-sm text-gray-500 gap-3 mt-1">
              <AvatarInitial :name="decryptUser(thread.author).name" />
              <UserName :name="decryptUser(thread.author).name" :email="decryptUser(thread.author).email" />
              <span>•</span>
              <span>
                {{ formatThreadDate(thread.createdAt) }}
              </span>
            </div>
            <!-- Last post info -->
            <div v-if="getLastPostInfo(thread.id)" class="flex items-center text-xs text-gray-400 gap-2 mt-1">
              <span>{{ $t('home.lastPostBy') }}</span>
              <UserName :name="getLastPostInfo(thread.id).name" :email="getLastPostInfo(thread.id).email" />
              <span>•</span>
              <span>{{ formatThreadDate(getLastPostInfo(thread.id).date) }}</span>
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

/* Drag and drop styles */
.cursor-grab {
  cursor: grab;
}

.cursor-grabbing {
  cursor: grabbing;
}

/* Prevent text selection during drag */
[draggable="true"] {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
