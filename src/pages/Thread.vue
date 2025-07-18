<script setup>
import { onMounted, ref, computed, watch, defineComponent, h, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '@/firebase'
import { ref as dbRef, onValue, push, serverTimestamp, update, get, remove } from 'firebase/database'
import { useForumStore } from '@/stores/forumStore'
import { decryptText, encryptText, deterministicEncryptText, encryptUser, decryptUser } from '@/utils/encryption'
import { sanitizeHTML } from '@/utils/sanitize'
import RichEditor from '@/components/RichEditor.vue'
import PostItem from '@/components/PostItem.vue'
import { formatDate, formatDateShort, formatDateRelative } from '@/utils/dateFormat'
import { useI18n } from 'vue-i18n'
import AvatarInitial from '@/components/AvatarInitial.vue'
import UserName from '@/components/UserName.vue'
import NewPostModal from '@/components/NewPostModal.vue'
import ErrorToast from '@/components/ErrorToast.vue'

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


const fetchThread = () => {
  onValue(dbRef(db, `threads/${threadId}`), (snapshot) => {
    const thread = snapshot.val()
    threadData.value = thread
    threadTitle.value = thread?.title || $t('thread.untitled')
  })
}

const fetchPosts = () => {
  onValue(dbRef(db, 'posts'), (snapshot) => {
    const all = snapshot.val() || {}

    posts.value = Object.entries(all)
      .map(([id, post]) => ({ id, ...post }))
      .filter((p) => String(p.threadId) === String(threadId))
      .sort((a, b) => a.createdAt - b.createdAt)
  })
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

  const encrypted = encryptText(sanitizeHTML(newReply.value))
  const encryptedAuthor = encryptUser(store.currentUser)

  const postRef = await push(dbRef(db, 'posts'), {
    threadId,
    parentId: parentId ?? null, // ensure null, not undefined
    content: encrypted,
    author: encryptedAuthor,
    createdAt: serverTimestamp(),
    likes: 0,
    likedBy: [],
    deleted: false
  })
  
  lastCreatedPostId.value = postRef.key
  console.log('Last created post ID:', lastCreatedPostId.value)

  newReply.value = ''
  replyingTo.value = null
}

const likePost = (postId, currentLikes, likedBy = []) => {
  const deterministicUserEmail = deterministicEncryptText(store.currentUser.email)
  const hasLiked = likedBy.includes(deterministicUserEmail)
  const postRef = dbRef(db, `posts/${postId}`)
  if (hasLiked) {
    // Remove like
    update(postRef, {
      likes: Math.max(0, currentLikes - 1),
      likedBy: likedBy.filter(email => email !== deterministicUserEmail)
    })
  } else {
    // Add like
    update(postRef, {
      likes: (currentLikes || 0) + 1,
      likedBy: [...(likedBy || []), deterministicUserEmail]
    })
  }
}

const deletePost = async (postId) => {
  try {
    const postRef = dbRef(db, `posts/${postId}`)
    const snapshot = await get(postRef)
    const post = snapshot.val()
    
    if (post && !post.deleted) {
      await update(postRef, {
        originalContent: post.content, // Store original content
        content: encryptText('[deleted]'),
        deleted: true
      })
    }
  } catch (error) {
    console.error('Error deleting post:', error)
  }
}

const restorePost = async (postId) => {
  try {
    // Get the current post data
    const postRef = dbRef(db, `posts/${postId}`)
    const snapshot = await get(postRef)
    const post = snapshot.val()
    
    console.log('Restoring post:', postId, post) // Debug log
    
    if (post && post.deleted) {
      // If we have original content, restore it
      if (post.originalContent) {
        console.log('Restoring with original content')
        await update(postRef, {
          content: post.originalContent,
          deleted: false,
          originalContent: null
        })
      } else {
        // For posts deleted before this feature, check if current content is not the standard deleted message
        const currentContent = decryptText(post.content)
        if (currentContent !== '[deleted]') {
          console.log('Restoring with current content (not standard deleted message)')
          await update(postRef, {
            deleted: false
          })
        } else {
          console.log('Setting placeholder content for old deleted post')
          await update(postRef, {
            content: encryptText('[Content was deleted]'),
            deleted: false
          })
        }
      }
    }
  } catch (error) {
    console.error('Error restoring post:', error)
  }
}

// Admin function to permanently delete a post and all its replies
const adminDeletePost = async (postId) => {
  try {
    // Get all posts to find replies
    const postsSnapshot = await get(dbRef(db, 'posts'))
    const allPosts = postsSnapshot.val() || {}
    
    // Find all posts that need to be deleted (the post and all its replies)
    const postsToDelete = new Set()
    const findReplies = (parentId) => {
      Object.entries(allPosts).forEach(([id, post]) => {
        if (post.parentId === parentId) {
          postsToDelete.add(id)
          findReplies(id) // Recursively find replies to replies
        }
      })
    }
    
    // Add the main post and find all its replies
    postsToDelete.add(postId)
    findReplies(postId)
    
    console.log('Deleting posts:', Array.from(postsToDelete))
    
    // Delete all posts in parallel
    const deletePromises = Array.from(postsToDelete).map(id => 
      remove(dbRef(db, `posts/${id}`))
    )
    
    await Promise.all(deletePromises)
    console.log('Successfully deleted', postsToDelete.size, 'posts')
    
  } catch (error) {
    console.error('Error deleting post and replies:', error)
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
    return decryptUser(posts.value[0].author).name
  }
  // Otherwise, use the thread's author
  if (threadData.value?.author) {
    return decryptUser(threadData.value.author).name
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

onMounted(() => {
  fetchThread()
  fetchPosts()
})

// Watch for route changes and re-fetch data
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      fetchThread()
      fetchPosts()
    }
  }
)

// Watch for hash changes to detect deleted posts
watch(
  () => route.hash,
  (newHash) => {
    if (newHash) {
      const postId = newHash.split('#').pop()
      // Check after a short delay to ensure posts are loaded
      setTimeout(() => {
        checkPostExists(postId)
      }, 500)
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
    return decryptUser(posts.value[0].author).email
  }
  if (threadData.value?.author) {
    return decryptUser(threadData.value.author).email
  }
  return ''
})

const editingPostId = ref(null) // Add this if not already present
const isAnyEditorOpen = computed(() => replyingTo.value !== null || showNewPostModal.value || editingPostId.value !== null)
</script>

<template>
  <div class="bg-[#f4f6f8] font-sans pt-32 flex-1 pb-16">
    <div class="max-w-5xl mx-auto px-4">
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
          :likePost="likePost"
          :deletePost="deletePost"
          :restorePost="restorePost"
          :reply="reply"
          :cancelReply="cancelReply"
          :store="store"
          :RichEditor="RichEditor"
          :sanitizeHTML="sanitizeHTML"
          :decryptText="decryptText"
          :encryptText="encryptText"
          :deterministicEncryptText="deterministicEncryptText"
          :adminDeletePost="adminDeletePost"
          :charLimit="store.charLimit"
          @update:newReply="val => newReply = val"
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
