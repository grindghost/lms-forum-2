<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useForumStore } from '@/stores/forumStore'
import { encryptText, decryptText, encryptUser, decryptUser } from '@/utils/encryption'
import { formatDate, formatDateShort, formatDateRelative } from '@/utils/dateFormat'
import { useI18n } from 'vue-i18n'
import AvatarInitial from '@/components/AvatarInitial.vue'
import UserName from '@/components/UserName.vue'
import DeleteThreadModal from '@/components/DeleteThreadModal.vue'
import { getThreads } from '@/services/getThreads'
import { createThread } from '@/services/createThread'
import { updateThread } from '@/services/updateThread'
import { deleteThread } from '@/services/deleteThread'
import { updateSortOrder } from '@/services/updateSortOrder'
import { getAllPosts } from '@/services/getPosts'

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
  // This logic needs to be updated to use a service method
  // For now, it will be a placeholder or require a new service method
  console.warn('toggleSubscribe is a placeholder and needs a service method')
  // Example: const threadRef = dbRef(db, `threads/${thread.id}`)
  // const subscribers = Array.isArray(thread.subscribers) ? [...thread.subscribers] : []
  // const idx = subscribers.indexOf(store.currentUser.email)
  // if (idx === -1) {
  //   subscribers.push(store.currentUser.email)
  // } else {
  //   subscribers.splice(idx, 1)
  // }
  // await update(threadRef, { subscribers })
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
const createThreadHandler = async () => {
  if (!newTitle.value.trim() || !store.groupId) return
  const encryptedAuthor = encryptUser(store.currentUser)
  await createThread({
    title: newTitle.value,
    author: encryptedAuthor,
    groupId: store.groupId
  })
  newTitle.value = ''
  await fetchThreadsAndPosts()
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
  await updateThread({ id: threadId, title: editingThreadTitle.value.trim() })
  editingThreadId.value = null
  editingThreadTitle.value = ''
  await fetchThreadsAndPosts()
}

const toggleReadOnly = async (threadId, isReadOnly) => {
  try {
    await updateThread({ id: threadId, readOnly: isReadOnly })
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
    const currentThreads = [...threads.value]
    const draggedIndex = currentThreads.findIndex(t => t.id === draggedThreadId)
    const targetIndex = currentThreads.findIndex(t => t.id === targetThreadId)
    if (draggedIndex === -1 || targetIndex === -1) return
    const newThreads = [...currentThreads]
    const [draggedThread] = newThreads.splice(draggedIndex, 1)
    let insertIndex = dropPosition.value === 'above' ? targetIndex : targetIndex + 1
    if (draggedIndex < targetIndex) insertIndex -= 1
    newThreads.splice(insertIndex, 0, draggedThread)
    const sortOrderStep = 1000
    const updates = {}
    newThreads.forEach((thread, index) => {
      const newSortOrder = (index + 1) * sortOrderStep
      updates[`threads/${thread.id}/sortOrder`] = newSortOrder
    })
    await updateSortOrder({ updates })
    await fetchThreadsAndPosts()
  } catch (error) {
    console.error('Error reordering threads:', error)
  } finally {
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

// Rename local deleteThread function to handleDeleteThread
const handleDeleteThread = async () => {
  if (!threadToDelete.value) return
  await deleteThread({ id: threadToDelete.value.id })
  showDeleteConfirm.value = false
  threadToDelete.value = null
  await fetchThreadsAndPosts()
}

// FETCH THREADS AND POSTS
const fetchThreadsAndPosts = async () => {
  if (!store.groupId) return
  const threadsData = await getThreads(store.groupId)
  threads.value = threadsData.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return b.createdAt - a.createdAt
  })
  // Fetch all posts for last post info
  const postsData = await getAllPosts()
  posts.value = postsData.reduce((acc, post) => {
    acc[post.id] = post
    return acc
  }, {})
}

// INIT FETCH
watch(
  () => [store.config, store.groupId],
  async ([config, groupId]) => {
    if (!config || !groupId) return
    await fetchThreadsAndPosts()
  },
  { immediate: true }
)
</script>

<template>
  <div class="bg-[#f4f6f8] font-sans pt-24 h-full flex-1 pb-16">
    <main class="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <!-- Create Thread Section -->
      <div v-if="store.isAdmin()" class="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          v-model="newTitle"
          :placeholder="$t('home.threadTitle')"
          class="input input-bordered w-full"
        />
        <button class="btn btn-primary w-full sm:w-auto" @click="createThreadHandler">
          {{ $t('home.createThread') }}
        </button>
      </div>

      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
        <h1 class="text-xl sm:text-2xl font-bold text-base-content font-overpass">
          {{ $t('home.forumThreads') }}
        </h1>
        <div class="text-sm text-gray-500">
          {{ $t('home.group') }}: <span class="font-semibold">{{ store.groupId }}</span>
        </div>
      </div>

      <!-- No Threads Message -->
      <div v-if="threads.length === 0" class="text-center text-gray-500 mt-8">
        {{ $t('home.noThreads') }}
      </div>

      <!-- Thread Cards Grid -->
      <div class="grid gap-3 sm:gap-4">
        <div
          v-for="thread in threads"
          :key="thread.id"
          class="rounded-lg bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-300 hover:border-primary cursor-pointer relative overflow-hidden"
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
          <!-- Subscribe Star -->
          <div v-if="isSubscribed(thread)" class="absolute top-2 right-2 z-10">
            <div class="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-100 rounded-full flex items-center justify-center shadow-sm">
              <span class="text-yellow-600 text-xs sm:text-sm">⭐</span>
            </div>
          </div>

          <!-- Main Card Content -->
          <div class="p-4 sm:p-6">
            <!-- Thread Title and Badges Row -->
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex-1 min-w-0">
                <!-- Edit Mode -->
                <div v-if="editingThreadId === thread.id" class="flex flex-col sm:flex-row items-start sm:items-center gap-2" @click.stop>
                  <input
                    v-model="editingThreadTitle"
                    class="input input-bordered input-sm flex-1"
                    @keyup.enter="saveEditThread(thread.id)"
                    @keyup.esc="cancelEditThread"
                    ref="editInput"
                  />
                  <div class="flex gap-1">
                    <button class="btn btn-sm btn-primary" @click="saveEditThread(thread.id)">
                      {{ $t('home.save') }}
                    </button>
                    <button class="btn btn-sm btn-outline" @click="cancelEditThread">
                      {{ $t('home.cancel') }}
                    </button>
                  </div>
                </div>
                
                <!-- Display Mode -->
                <div v-else class="flex items-start gap-2">
                  <!-- Drag Handle (Admin Only) -->
                  <div v-if="store.isAdmin()" class="text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 text-xl" :title="$t('home.dragToReorder')">
                    ⋮⋮
                  </div>
                  
                  <!-- Thread Title -->
                  <h2 class="card-title font-overpass font-[400] text-base sm:text-lg leading-tight break-words mt-[0.3rem]">
                    {{ thread.title }}
                  </h2>
                </div>
              </div>
              
              <!-- Badges -->
              <div class="flex sm:flex-row gap-1 sm:gap-2 flex-shrink-0">
                <div class="badge badge-primary badge-outline text-xs">
                  {{ thread.messageCount }} {{ $t('home.messages') }}
                </div>
                <div v-if="thread.readOnly" class="badge badge-warning badge-outline text-xs" title="Read-only thread">
                  🔒
                </div>
              </div>
            </div>

            <!-- Author and Date Info -->
            <div class="flex items-center text-sm text-gray-500 gap-2 mb-2">
              <AvatarInitial :name="decryptUser(thread.author).name" class="w-5 h-5 sm:w-6 sm:h-6" />
              <UserName :name="decryptUser(thread.author).name" :email="decryptUser(thread.author).email" class="text-sm" />
              <span class="hidden sm:inline">•</span>
              <span class="text-xs sm:text-sm">
                {{ formatThreadDate(thread.createdAt) }}
              </span>
            </div>
            
            <!-- Last Post Info -->
            <div v-if="getLastPostInfo(thread.id)" class="flex flex-col sm:flex-row items-start sm:items-center text-xs text-gray-400 gap-1 mb-3">
              <span>{{ $t('home.lastPostBy') }}</span>
              <UserName :name="getLastPostInfo(thread.id).name" :email="getLastPostInfo(thread.id).email" class="text-xs" />
              <span class="hidden sm:inline">•</span>
              <span class="text-xs">{{ formatThreadDate(getLastPostInfo(thread.id).date) }}</span>
            </div>

            <!-- Bottom Controls Row -->
            <div class="flex flex-row justify-between gap-3 pt-3 border-t border-base-200">
              <!-- Subscribe Section -->
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

              <!-- Admin Controls -->
              <div v-if="store.isAdmin()" class="flex items-center gap-2" @click.stop>
                <!-- Read-only Toggle -->
                <div class="flex items-center gap-1">
                  <label class="label cursor-pointer gap-1">
                    <span class="label-text text-xs">{{ $t('home.readOnly') }}</span>
                    <input
                      type="checkbox"
                      :checked="thread.readOnly || false"
                      @change="toggleReadOnly(thread.id, $event.target.checked)"
                      class="checkbox checkbox-xs"
                    />
                  </label>
                </div>
                
                <!-- Admin Action Buttons -->
                <div class="flex gap-1">
                  <button
                    v-if="editingThreadId !== thread.id"
                    class="btn btn-xs btn-outline"
                    @click="startEditingThread(thread)"
                    title="Edit thread title"
                  >
                    ✏️
                  </button>
                  <button
                    v-if="editingThreadId !== thread.id"
                    class="btn btn-xs btn-outline btn-error"
                    @click="confirmDeleteThread(thread)"
                    title="Delete thread"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <DeleteThreadModal
      :show="showDeleteConfirm"
      :threadTitle="threadToDelete?.title || ''"
      @cancel="cancelDeleteThread"
      @confirm="handleDeleteThread"
    />
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
