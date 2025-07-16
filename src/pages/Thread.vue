<script setup>
import { onMounted, ref, computed, watch, defineComponent, h, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useForumStore } from '@/stores/forumStore'
// Encryption utilities removed; backend now handles encryption
import { sanitizeHTML } from '@/utils/sanitize'
import RichEditor from '@/components/RichEditor.vue'
import PostItem from '@/components/PostItem.vue'
import { formatDate, formatDateShort, formatDateRelative } from '@/utils/dateFormat'
import { useI18n } from 'vue-i18n'
import AvatarInitial from '@/components/AvatarInitial.vue'
import UserName from '@/components/UserName.vue'
import NewPostModal from '@/components/NewPostModal.vue'
import ErrorToast from '@/components/ErrorToast.vue'
import { getThread } from '@/services/getThread'
import { getPosts } from '@/services/getPosts'
import { createPost } from '@/services/createPost'
import { likePost } from '@/services/likePost'
import { softDeletePost } from '@/services/softDeletePost'
import { restorePost } from '@/services/restorePost'
import { adminDeletePost } from '@/services/adminDeletePost'
import { updatePost } from '@/services/updatePost'
import YellowSpinner from '@/components/YellowSpinner.vue'

const { t: $t, locale } = useI18n()

const route = useRoute()
const store = useForumStore()
const threadId = route.params.id

const threadTitle = ref('Loading…')
const threadData = ref(null)
const posts = ref([])
const newReply = ref('')
const replyingTo = ref(null)

const showNewPostModal = ref(false)
const hideDeletedPosts = ref(false)

// Deleted post detection state
const showDeletedPostToast = ref(false)

const lastCreatedPostId = ref(null)

const showErrorToast = ref(false)
const errorMessage = ref('')
const previousPosts = ref([])

const openNewPostModal = () => {
  replyingTo.value = null
  showNewPostModal.value = true
}

const closeNewPostModal = () => {
  newReply.value = ''
  showNewPostModal.value = false
}

// Function to check if a post exists and show toast if it doesn't
const checkPostExists = (postId) => {
  const postExists = posts.value.some(post => post.id === postId)
  if (!postExists) {
    showDeletedPostToast.value = true
    setTimeout(() => { showDeletedPostToast.value = false }, 3000)
  }
}

const isLoading = ref(true)

const fetchThread = async () => {
  isLoading.value = true
  const data = await getThread(threadId)
  threadData.value = data
  threadTitle.value = data?.title || $t('thread.untitled')
}

const fetchPosts = async () => {
  const all = await getPosts(threadId)
  posts.value = all.sort((a, b) => a.createdAt - b.createdAt)
  isLoading.value = false
}

const showReplyEditor = (postId) => {
  replyingTo.value = postId
  newReply.value = ''
}

const cancelReply = () => {
  replyingTo.value = null
  newReply.value = ''
}

const reply = async (parentId = null) => {
  if (!newReply.value.trim()) return
  const tempId = 'temp-' + Date.now()
  // Optimistically add post
  const optimisticPost = {
    id: tempId,
    threadId,
    parentId: parentId ?? null,
    content: sanitizeHTML(newReply.value),
    author: store.currentUser,
    createdAt: Date.now(),
    deleted: false,
    likes: 0,
    likedBy: [],
    updatedAt: Date.now()
  }
  posts.value.push(optimisticPost)
  lastCreatedPostId.value = tempId
  const oldReply = newReply.value
  newReply.value = ''
  replyingTo.value = null
  try {
    const created = await createPost({
      threadId,
      parentId: parentId ?? null,
      content: optimisticPost.content,
      author: store.currentUser
    })
    // Merge real post data with optimistic one
    const idx = posts.value.findIndex(p => p.id === tempId)
    if (idx !== -1) {
      posts.value[idx] = { ...posts.value[idx], ...created }
      lastCreatedPostId.value = posts.value[idx].id
    }
  } catch (e) {
    posts.value = posts.value.filter(p => p.id !== tempId)
    errorMessage.value = $t('thread.createPostError') || 'Failed to create post'
    showErrorToast.value = true
    setTimeout(() => (showErrorToast.value = false), 3000)
  }
}

const likePostHandler = async (postId, currentLikes, likedBy = []) => {
  const idx = posts.value.findIndex(p => p.id === postId)
  if (idx === -1) return
  const userEmail = store.currentUser.email
  const hasLiked = likedBy.includes(userEmail)
  // Optimistically update
  const oldLikes = posts.value[idx].likes
  const oldLikedBy = [...posts.value[idx].likedBy]
  if (hasLiked) {
    posts.value[idx].likes = oldLikes - 1
    posts.value[idx].likedBy = oldLikedBy.filter(e => e !== userEmail)
  } else {
    posts.value[idx].likes = oldLikes + 1
    posts.value[idx].likedBy = [...oldLikedBy, userEmail]
  }
  try {
    await likePost({
      postId,
      userEmail,
      likedBy: posts.value[idx].likedBy,
      currentLikes: posts.value[idx].likes
    })
  } catch (e) {
    posts.value[idx].likes = oldLikes
    posts.value[idx].likedBy = oldLikedBy
    errorMessage.value = $t('thread.likePostError') || 'Failed to like post'
    showErrorToast.value = true
    setTimeout(() => (showErrorToast.value = false), 3000)
  }
}

const deletePost = async (postId, content) => {
  const idx = posts.value.findIndex(p => p.id === postId)
  if (idx === -1) return
  const oldDeleted = posts.value[idx].deleted
  // Optimistically mark as deleted
  posts.value[idx].deleted = true
  try {
    await softDeletePost({ postId, content })
  } catch (e) {
    posts.value[idx].deleted = oldDeleted
    errorMessage.value = $t('thread.deletePostError') || 'Failed to delete post'
    showErrorToast.value = true
    setTimeout(() => (showErrorToast.value = false), 3000)
  }
}

const restorePostHandler = async (postId, originalContent) => {
  await restorePost({ postId, originalContent })
  await fetchPosts()
}

const adminDeletePostHandler = async (postId) => {
  await adminDeletePost({ postId })
  await fetchPosts()
}

const updatePostHandler = async (postId, content) => {
  const idx = posts.value.findIndex(p => p.id === postId)
  if (idx === -1) return
  const oldContent = posts.value[idx].content
  // Optimistically update
  posts.value[idx].content = content
  try {
    await updatePost({ postId, content })
  } catch (e) {
    posts.value[idx].content = oldContent
    errorMessage.value = $t('thread.editPostError') || 'Failed to edit post'
    showErrorToast.value = true
    setTimeout(() => (showErrorToast.value = false), 3000)
  }
}

const nestedPosts = computed(() => {
  const map = {}
  posts.value.forEach((p) => {
    // treat undefined and null as the same key
    const key = p.parentId == null ? null : p.parentId
    if (!map[key]) map[key] = []
    map[key].push(p)
  })
  return map
})

// Computed properties for thread header
const threadAuthor = computed(() => {
  // If there are posts, use the first post's author
  if (posts.value.length > 0 && posts.value[0]?.author) {
    return posts.value[0].author.name
  }
  // Otherwise, use the thread's author
  if (threadData.value?.author) {
    return threadData.value.author.name
  }
  return null
})

const threadAuthorInitial = computed(() => {
  const author = threadAuthor.value
  return author ? author.charAt(0).toUpperCase() : '?'
})

const threadDate = computed(() => {
  // If there are posts, use the first post's date
  if (posts.value.length > 0 && posts.value[0]?.createdAt) {
    return formatDate(posts.value[0].createdAt, locale.value)
  }
  // Otherwise, use the thread's date
  if (threadData.value?.createdAt) {
    return formatDate(threadData.value.createdAt, locale.value)
  }
  return ''
})

// Check if user can post in this thread
const canPost = computed(() => {
  // Admin can always post
  if (store.isAdmin()) return true
  // If thread is read-only, only admin can post
  if (threadData.value?.readOnly) return false
  // Otherwise, anyone can post
  return true
})

const renderPosts = (parentId = null, depth = 0) => {
  const list = nestedPosts.value[parentId == null ? null : parentId] || []
  const filteredList = hideDeletedPosts.value 
    ? list.filter(p => !p.deleted)
    : list
  
  // If thread is read-only, only show original posts (depth 0) and hide all replies
  if (threadData.value?.readOnly && depth > 0) {
    return []
  }
  
  return filteredList.map((p) => ({
    ...p,
    replies: renderPosts(p.id, depth + 1),
    depth
  }))
}

onMounted(async () => {
  await fetchThread()
  await fetchPosts()
})

// Watch for route changes and re-fetch data
watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId !== oldId) {
      await fetchThread()
      await fetchPosts()
    }
  }
)

// Watch for hash changes to detect deleted posts
watch(
  () => [route.hash, isLoading.value],
  ([newHash, loading]) => {
    if (!loading && newHash) {
      const postId = newHash.split('#').pop()
      checkPostExists(postId)
    }
  },
  { immediate: true }
)

// Watch for new posts and scroll to the last created one if needed
watch(lastCreatedPostId, async (newId) => {
  if (newId) {
    await nextTick()
    setTimeout(() => {
      const el = document.getElementById(newId)
      console.log('Scrolling to post:', newId, 'Element found:', !!el)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      lastCreatedPostId.value = null
    }, 100)
  }
})

function goToCallback() {
  if (store.config?.callbackURL) {
    window.location.href = store.config.callbackURL
  }
}

// Add a computed for threadAuthorEmail
const threadAuthorEmail = computed(() => {
  if (posts.value.length > 0 && posts.value[0]?.author) {
    return posts.value[0].author.email
  }
  if (threadData.value?.author) {
    return threadData.value.author.email
  }
  return ''
})

const editingPostId = ref(null)
const isAnyEditorOpen = computed(() => replyingTo.value !== null || showNewPostModal.value || editingPostId.value !== null)

function startEditing(postId) {
  editingPostId.value = postId;
}

function stopEditing() {
  editingPostId.value = null;
}
</script>

<template>
  <div class="bg-[#f4f6f8] font-sans pt-32 flex-1 pb-16">
    <ErrorToast :show="showErrorToast" :message="errorMessage" />
    <YellowSpinner v-if="isLoading" />
    <div v-else class="max-w-5xl mx-auto px-4">
      <!-- Thread Header -->
      <div class="mb-6 border-b pb-4">
        <h1 class="text-[1.5rem] font-regular font-overpass text-base-content">
          {{ threadTitle }}
        </h1>
        <div class="text-sm text-base-content/70 mt-1 flex gap-2 items-center">
          <AvatarInitial :name="threadAuthor || '?'" />
          <UserName :name="threadAuthor || '?'" :email="threadAuthorEmail || ''" />
          <span v-if="threadDate">•</span>
          <span v-if="threadDate"> {{ threadDate }}</span>
        </div>
      </div>

      <!-- Hide Deleted Posts Checkbox and Add Post Button Row -->
      <div class="mb-4 flex items-center gap-2 justify-between">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="hideDeletedPosts"
            v-model="hideDeletedPosts"
            class="checkbox checkbox-sm"
          />
          <label for="hideDeletedPosts" class="text-sm text-base-content/70 cursor-pointer">
            {{ $t('thread.hideDeletedPosts') }}
          </label>
        </div>
        <div v-if="canPost" class="flex items-center">
          <button
            class="bg-blue-600 text-white rounded-full shadow-lg w-10 h-10 flex items-center justify-center text-3xl hover:bg-blue-700 transition"
            @click="openNewPostModal"
            aria-label="Add new post"
          >
            +
          </button>
        </div>
      </div>

      <!-- Posts List -->
      <div v-if="renderPosts().length > 0" class="space-y-4">
        <PostItem
          v-for="post in renderPosts()"
          :key="post.id"
          :post="post"
          :threadData="threadData"
          :replyingTo="replyingTo"
          :editingPostId="editingPostId"
          :isAnyEditorOpen="isAnyEditorOpen"
          :newReply="newReply"
          :depth="post.depth"
          :renderPosts="renderPosts"
          :showReplyEditor="showReplyEditor"
          :likePost="likePostHandler"
          :deletePost="deletePost"
          :restorePost="restorePostHandler"
          :reply="reply"
          :cancelReply="cancelReply"
          :store="store"
          :RichEditor="RichEditor"
          :sanitizeHTML="sanitizeHTML"
          :adminDeletePost="adminDeletePostHandler"
          :updatePost="updatePostHandler"
          :charLimit="store.charLimit"
          @update:newReply="val => newReply = val"
          @startEditing="startEditing"
          @stopEditing="stopEditing"
        />
      </div>

      <!-- No Posts Message -->
      <div v-else class="text-center py-12">
        <div class="max-w-md mx-auto">
          <div class="text-6xl mb-4">💬</div>
          <h3 class="text-xl font-semibold text-base-content mb-2">
            {{ $t('thread.noPostsYet') }}
          </h3>
          <p class="text-base-content/70 mb-6">
            {{ $t('thread.beFirstToPost') }}
          </p>
          <button 
            v-if="canPost"
            class="btn btn-primary btn-lg"
            @click="openNewPostModal"
          >
            {{ $t('thread.createFirstPost') }}
          </button>
          <div v-else class="text-base-content/60">
            {{ $t('thread.readOnlyThread') }}
          </div>
        </div>
      </div>

      <!-- New Post Modal -->
      <NewPostModal
        :show="showNewPostModal"
        v-model:content="newReply"
        :RichEditor="RichEditor"
        :charLimit="store.charLimit"
        @cancel="closeNewPostModal"
        @confirm="() => { reply(null); closeNewPostModal() }"
      />

      <!-- Deleted Post Toast -->
      <ErrorToast 
        :show="showDeletedPostToast" 
        :message="$t('thread.postDeleted')" 
      />

    </div>
  </div>
</template>


<style>
@import url('https://fonts.googleapis.com/css2?family=Overpass:wght@700&family=Source+Sans+Pro:wght@400;600&display=swap');

.font-overpass {
  font-family: 'Overpass', sans-serif;
}
.font-sans {
  font-family: 'Source Sans Pro', sans-serif;
}
</style>
