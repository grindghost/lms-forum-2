<template>
  <!-- Outer Wrapper -->
  <div
    :class="[depth > 0 ? 'pl-4' : '', 'w-full']"
    :id="post.id"
    ref="postRef"
    :data-highlight="isHighlighted"
  >
    <div class="flex gap-2 w-full">
      <!-- Avatar -->
      <AvatarInitial :name="decryptUser(post.author).name" class="mt-3" />

      <!-- Post Body -->
      <div
        class="flex-1 border border-base-300 shadow-sm p-4 rounded-lg transition hover:shadow-md relative"
        :class="[
          getNestingBg(depth),
          post.deleted ? 'opacity-40 italic' : '',
          isHighlighted ? 'highlighted-post' : ''
        ]"
        @mouseenter.stop="handleMouseEnter"
        @mouseleave.stop="handleMouseLeave"
        @mousemove.stop="handleMouseMove"
      >
        <!-- Meta Info -->
        <div class="text-sm text-base-content/60 mb-1 flex justify-between items-center gap-2">
          <UserName :name="decryptUser(post.author).name" :email="decryptUser(post.author).email" />
          <div class="flex items-center gap-2">
            <span>{{ formattedDate }}</span>
            <span v-if="post.likes > 0" class="flex items-center gap-1">
              • <span title="Likes">👍 {{ post.likes }}</span>
            </span>
            <span v-if="post.replies && post.replies.length > 0" class="flex items-center gap-1">
              • <span title="Replies">💬 {{ post.replies.length }}</span>
            </span>
            <!-- Copy Link Button -->
            <button
              class="btn btn-xs btn-ghost px-2 py-0 text-base-content/60 hover:text-primary"
              @click.stop="copyPostLink"
              :title="$t('thread.copyLink')"
            >
              <img src="@/assets/url.svg" alt="Copy link" class="w-4 h-4 url-icon" />
            </button>
          </div>
        </div>
        <!-- Custom Toast -->
        <CustomToast 
          :show="showCopiedToast" 
          :message="$t('thread.linkCopied')" 
        />

        <!-- Content -->
        <div class="text-base-content text-sm min-h-[1.5em] whitespace-pre-line break-words">
          <span v-if="post.deleted" class="font-bold text-base-content/80">
            {{ $t('thread.deletedContent') }}
          </span>
          <template v-else>
            <div v-if="editingPostId === post.id">
              <RichEditor v-model="editingContent" :placeholder="$t('thread.writeReply')" />
              <div class="flex gap-2 mt-2">
                <button class="btn btn-sm btn-primary" @click="saveEdit(post.id)">{{ $t('thread.save') }}</button>
                <button class="btn btn-sm btn-outline" @click="cancelEdit">{{ $t('thread.cancel') }}</button>
              </div>
            </div>
            <div v-else class="prose prose-sm max-w-none" v-html="sanitizeHTML(decryptText(post.content))"></div>
          </template>
        </div>

        <!-- Actions -->
        <div
          v-if="!post.deleted && editingPostId !== post.id"
          class="post-actions flex flex-wrap gap-2 text-xs mt-3"
          :class="{ 'show-actions': isHovered || replyingTo === post.id }"
        >
          <button v-if="canReply" class="btn btn-xs btn-outline btn-primary" @click="showReplyEditor(post.id)">
            {{ $t('thread.reply') }}
          </button>
          <button
            class="btn btn-xs btn-outline"
            :class="{ 'btn-primary': isLiked }"
            @click="likePost(post.id, post.likes, post.likedBy || [])"
          >
            👍 {{ post.likes }}
          </button>
          <button
            v-if="store.isAdmin() || decryptUser(post.author).email === store.currentUser.email"
            class="btn btn-xs btn-outline btn-error"
            @click="store.isAdmin() ? confirmDeletePost(post.id) : deletePost(post.id)"
          >
            {{ $t('thread.delete') }}
          </button>
          <button
            v-if="decryptUser(post.author).email === store.currentUser.email"
            class="btn btn-xs btn-outline btn-accent"
            @click="startEditing(post.id, sanitizeHTML(decryptText(post.content)))"
          >
            {{ $t('thread.edit') }}
          </button>
        </div>
        
        <!-- Actions for Deleted Posts -->
        <div
          v-if="post.deleted && editingPostId !== post.id"
          class="post-actions flex flex-wrap gap-2 text-xs mt-3"
          :class="{ 'show-actions': isHovered || replyingTo === post.id }"
        >
          <button
            v-if="decryptUser(post.author).email === store.currentUser.email"
            class="btn btn-xs btn-outline btn-success"
            @click="restorePost(post.id)"
          >
            {{ $t('thread.restore') }}
          </button>
        </div>

        <!-- Reply Editor -->
        <div v-if="replyingTo === post.id" class="mt-4 space-y-2">
          <RichEditor v-model="newReplyModel" :placeholder="$t('thread.writeReply')" />
          <div class="flex gap-2">
            <button class="btn btn-sm btn-primary" @click="reply(post.id)">
              {{ $t('thread.send') }}
            </button>
            <button class="btn btn-sm btn-outline" @click="cancelReply">
              {{ $t('thread.cancel') }}
            </button>
          </div>
        </div>

        <!-- Nested Replies -->
        <div v-if="post.replies?.length" class="mt-4 space-y-4 w-full">
          <PostItem
            v-for="child in post.replies"
            :key="child.id"
            class="w-full"
            :post="child"
            :replyingTo="replyingTo"
            :newReply="newReply"
            :depth="child.depth"
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
            @update:newReply="emit('update:newReply', $event)"
          />
        </div>
      </div>
    </div>
  </div>
  <!-- Delete Confirmation Modal -->
  <DeletePostModal
    :show="showDeleteConfirm"
    :postAuthor="decryptUser(props.post.author).name"
    :postDate="formattedDate"
    @cancel="cancelDeletePost"
    @confirm="executeDeletePost"
  />
</template>


<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { defineProps, defineEmits } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { formatDate } from '@/utils/dateFormat'
import { decryptUser } from '@/utils/encryption'
import { db } from '@/firebase'
import { ref as dbRef, update, serverTimestamp } from 'firebase/database'
import AvatarInitial from '@/components/AvatarInitial.vue'
import UserName from '@/components/UserName.vue'
import CustomToast from '@/components/CustomToast.vue'
import DeletePostModal from '@/components/DeletePostModal.vue'

const { t: $t, locale } = useI18n()
const route = useRoute()

const props = defineProps({
  post: Object,
  threadData: Object,
  replyingTo: [String, null],
  newReply: String,
  depth: Number,
  renderPosts: Function,
  showReplyEditor: Function,
  likePost: Function,
  deletePost: Function,
  restorePost: Function,
  reply: Function,
  cancelReply: Function,
  store: Object,
  RichEditor: Object,
  sanitizeHTML: Function,
  decryptText: Function,
  encryptText: Function,
  deterministicEncryptText: Function,
  adminDeletePost: Function
})

const emit = defineEmits(['update:newReply'])

const isLiked = computed(() =>
  (props.post.likedBy || []).includes(
    props.deterministicEncryptText(props.store.currentUser.email)
  )
)

const newReplyModel = computed({
  get: () => props.newReply,
  set: (val) => emit('update:newReply', val)
})

const getNestingBg = (depth) => {
  if (depth <= 0) return 'bg-base-100'
  if (depth === 1) return 'bg-gray-50'
  if (depth === 2) return 'bg-gray-100'
  if (depth === 3) return 'bg-gray-200'
  return 'bg-gray-300'
}

const editingPostId = ref(null)
const editingContent = ref('')

// Use computed property to check if this post is the currently hovered one
const isHovered = computed(() => props.store.hoveredPostId === props.post.id)

// Computed property for formatted date that reacts to locale changes
const formattedDate = computed(() => {
  if (!props.post.createdAt) return $t('thread.pending')
  return formatDate(props.post.createdAt, locale.value)
})

// Check if user can reply to posts
const canReply = computed(() => {
  // If thread is read-only, no one can reply (not even admins)
  if (props.threadData?.readOnly) return false
  // Admin can always reply in non-read-only threads
  if (props.store.isAdmin()) return true
  // Otherwise, anyone can reply
  return true
})

// Delete confirmation state
const showDeleteConfirm = ref(false)
const postToDelete = ref(null)

// --- Copy Link Logic ---
const showCopiedToast = ref(false)
function copyPostLink() {
  const url = `${window.location.origin}/#/thread/${route.params.id}#${props.post.id}`
  navigator.clipboard.writeText(url)
  showCopiedToast.value = true
  setTimeout(() => { showCopiedToast.value = false }, 2000)
}

// --- Delete confirmation logic ---
function confirmDeletePost(postId) {
  postToDelete.value = postId
  showDeleteConfirm.value = true
}

function cancelDeletePost() {
  showDeleteConfirm.value = false
  postToDelete.value = null
}

function executeDeletePost() {
  if (postToDelete.value) {
    // Call the admin delete function (to be implemented in Thread.vue)
    props.adminDeletePost(postToDelete.value)
    showDeleteConfirm.value = false
    postToDelete.value = null
  }
}

// --- Highlight on hash logic ---
const postRef = ref(null)
const isHighlighted = ref(false)

function maybeHighlightOnHash() {
  // Extract the post ID from the URL hash
  const fullHash = window.location.hash
  const postIdFromHash = fullHash.split('#').pop() // Get the last part after the last #
  
  console.log('Hash check:', {
    fullHash,
    postIdFromHash,
    postId: props.post.id,
    matches: postIdFromHash === props.post.id
  })
  
  if (postIdFromHash === props.post.id) {
    console.log('Scrolling to post:', props.post.id)
    nextTick(() => {
      postRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      isHighlighted.value = true
      setTimeout(() => { isHighlighted.value = false }, 2500)
    })
  }
}

// Watch for hash changes in the URL
watch(() => window.location.hash, (newHash) => {
  const postIdFromHash = newHash.split('#').pop()
  if (postIdFromHash === props.post.id) {
    console.log('Hash changed, scrolling to post:', props.post.id)
    nextTick(() => {
      postRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      isHighlighted.value = true
      setTimeout(() => { isHighlighted.value = false }, 2500)
    })
  }
})

onMounted(() => {
  // Check for hash on mount (for direct URL access)
  maybeHighlightOnHash()
  
  // Also check after a short delay to handle cases where the component mounts before the hash is processed
  setTimeout(() => {
    maybeHighlightOnHash()
  }, 500)
})

function handleMouseEnter() {
  props.store.setHoveredPost(props.post.id)
}

function handleMouseMove() {
  // Update hover state when mouse moves within the post
  props.store.setHoveredPost(props.post.id)
}

function handleMouseLeave() {
  props.store.setHoveredPost(null)
}

function startEditing(postId, content) {
  editingPostId.value = postId
  editingContent.value = content
}

function cancelEdit() {
  editingPostId.value = null
  editingContent.value = ''
}

async function saveEdit(postId) {
  const encrypted = props.encryptText(props.sanitizeHTML(editingContent.value))
  await update(dbRef(db, `posts/${postId}`), {
    content: encrypted,
    createdAt: serverTimestamp()
  })
  editingPostId.value = null
  editingContent.value = ''
}

const getInitials = (name) => name?.charAt(0)?.toUpperCase() || '?'

// Cleanup hover state on component unmount
onUnmounted(() => {
  // Clear hover state if this post was the hovered one
  if (props.store.hoveredPostId === props.post.id) {
    props.store.setHoveredPost(null)
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Overpass:wght@700&family=Source+Sans+Pro:wght@400;600&display=swap');

.font-overpass {
  font-family: 'Overpass', sans-serif;
}
.font-sans {
  font-family: 'Source Sans Pro', sans-serif;
}

.url-icon {
  filter: brightness(0) saturate(100%) invert(60%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%);
}
</style>

<style>
/* Custom styles for post content headings and code blocks (global) */
.prose h1 {
  font-size: 1.3rem;
  font-weight: 700;
  margin-top: 0.8em;
  margin-bottom: 0.5em;
  color: #1a202c;
}
.prose h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.4em;
  color: #1a202c;
}
.prose pre {
  background: #f4f6f8;
  border: 1px solid #dddddd;
  color: #222;
  border-radius: 0.375rem;
  padding: 1em;
  font-size: 0.95em;
  overflow-x: auto;
  margin: 1em 0;
}
.prose code {
  background: #f6f8f9;
  color: #000;
  border-radius: 0.25rem;
  padding: 0.15em 0.4em;
  font-size: 0.95em;
}

/* Restore post action button hiding logic */
.post-actions {
  opacity: 0;
  transform: translateY(-5px);
  transition: all 0.2s ease;
  pointer-events: none;
  max-height: 0;
  overflow: hidden;
  margin-top: 0;
}
.post-actions.show-actions {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
  max-height: 2rem;
  margin-top: 0.75rem;
}
.highlighted-post {
  border-right: 8px solid #ffd600 !important;
  animation: pulse-highlight 2.5s cubic-bezier(0.4, 0, 0.6, 1);
}
@keyframes pulse-highlight {
  0% { box-shadow: 0 0 0 0 #ffd60066; }
  50% { box-shadow: 0 0 0 8px #ffd60033; }
  100% { box-shadow: 0 0 0 0 #ffd60000; }
}
</style>
