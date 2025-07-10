<template>
  <!-- Outer Wrapper -->
  <div :class="[depth > 0 ? 'pl-4' : '', 'w-full']">
    <div class="flex gap-3 w-full">
      <!-- Avatar -->
      <div class="avatar placeholder w-6 h-6 shrink-0">
        <div class="bg-neutral-focus text-neutral-content rounded-full w-10">
          <span class="text-sm font-fraunces font-extrabold">
            {{ getInitials(decryptUser(post.author).name) }}
          </span>
        </div>
      </div>

      <!-- Post Body -->
      <div
        class="flex-1 border border-base-300 shadow-sm p-4 rounded-lg transition hover:shadow-md relative"
        :class="[
          getNestingBg(depth),
          post.deleted ? 'opacity-40 italic' : ''
        ]"
        @mouseenter.stop="handleMouseEnter"
        @mouseleave.stop="handleMouseLeave"
        @mousemove.stop="handleMouseMove"
      >
        <!-- Meta Info -->
        <div class="text-sm text-base-content/60 mb-1 flex justify-between">
          <span>
            {{ decryptUser(post.author).name }}
          </span>
          <span>
            {{ formattedDate }}
          </span>
        </div>

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
            <span v-else v-html="sanitizeHTML(decryptText(post.content))" />
          </template>
        </div>

        <!-- Actions -->
        <div v-if="!post.deleted && editingPostId !== post.id" class="post-actions flex flex-wrap gap-2 text-xs mt-3" :class="{ 'show-actions': isHovered }">
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
            @click="deletePost(post.id)"
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
        <div v-if="post.deleted && editingPostId !== post.id" class="post-actions flex flex-wrap gap-2 text-xs mt-3" :class="{ 'show-actions': isHovered }">
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
            @update:newReply="emit('update:newReply', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { computed, ref, onUnmounted } from 'vue'
import { defineProps, defineEmits } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate } from '@/utils/dateFormat'
import { decryptUser } from '@/utils/encryption'
import { db } from '@/firebase'
import { ref as dbRef, update, serverTimestamp } from 'firebase/database'

const { t: $t, locale } = useI18n()

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
  deterministicEncryptText: Function
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
  // Admin can always reply
  if (props.store.isAdmin()) return true
  // If thread is read-only, only admin can reply
  if (props.threadData?.readOnly) return false
  // Otherwise, anyone can reply
  return true
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
/* Style lists in displayed content - more specific to override Tailwind */
div.text-base-content ul,
div.text-base-content span ul,
div.text-base-content ol,
div.text-base-content span ol {
  list-style: revert !important;
  padding-left: 1.5em !important;
  margin: 0.5em 0 !important;
}

div.text-base-content ul,
div.text-base-content span ul {
  list-style-type: disc !important;
}

div.text-base-content ol,
div.text-base-content span ol {
  list-style-type: decimal !important;
}

div.text-base-content li,
div.text-base-content span li {
  margin: 0.25em 0 !important;
}

/* Style other rich text elements */
.text-base-content strong,
.text-base-content span strong {
  font-weight: bold;
}

.text-base-content em,
.text-base-content span em {
  font-style: italic;
}

.text-base-content u,
.text-base-content span u {
  text-decoration: underline;
}

.text-base-content a,
.text-base-content span a {
  color: #2563eb;
  text-decoration: underline;
  cursor: pointer;
}

.text-base-content a:hover,
.text-base-content span a:hover {
  color: #1d4ed8;
}

/* Text alignment */
.text-base-content p[style*="text-align: center"],
.text-base-content span p[style*="text-align: center"] {
  text-align: center;
}

.text-base-content p[style*="text-align: right"],
.text-base-content span p[style*="text-align: right"] {
  text-align: right;
}

.text-base-content p[style*="text-align: left"],
.text-base-content span p[style*="text-align: left"] {
  text-align: left;
}

/* Post actions hover functionality */
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

/* Always show actions when editing or replying */
.post-actions.show-actions,
.post-actions:has(+ div:has(.RichEditor)) {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
  max-height: 2rem;
  margin-top: 0.75rem;
}
</style>
