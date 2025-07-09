<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '@/firebase'
import { ref as dbRef, onValue, push, serverTimestamp, update } from 'firebase/database'
import { useForumStore } from '@/stores/forumStore'
import { decryptText, encryptText } from '@/utils/encryption'
import { sanitizeHTML } from '@/utils/sanitize'

const route = useRoute()
const store = useForumStore()
const threadId = route.params.id

const threadTitle = ref('Loading…')
const posts = ref([])
const newReply = ref('')
const replyingTo = ref(null)

const fetchThread = () => {
  onValue(dbRef(db, `threads/${threadId}`), (snapshot) => {
    const thread = snapshot.val()
    threadTitle.value = thread?.title || 'Untitled'
  })
}

const fetchPosts = () => {
  onValue(dbRef(db, 'posts'), (snapshot) => {
    const all = snapshot.val() || {}

    posts.value = Object.entries(all)
      .map(([id, post]) => ({ id, ...post }))
      .filter((p) => p.threadId === threadId)
      .sort((a, b) => b.createdAt - a.createdAt)
  })
}

const reply = async () => {
  if (!newReply.value.trim()) return

  const encrypted = encryptText(sanitizeHTML(newReply.value))

  await push(dbRef(db, 'posts'), {
    threadId,
    parentId: replyingTo.value,
    content: encrypted,
    author: store.currentUser.email,
    createdAt: serverTimestamp(),
    likes: 0,
    deleted: false
  })

  newReply.value = ''
  replyingTo.value = null
}

const likePost = (postId, currentLikes) => {
  update(dbRef(db, `posts/${postId}`), {
    likes: currentLikes + 1
  })
}

const deletePost = (postId) => {
  update(dbRef(db, `posts/${postId}`), {
    content: encryptText('[deleted]'),
    deleted: true
  })
}

const nestedPosts = computed(() => {
  const map = {}
  posts.value.forEach((p) => {
    if (!map[p.parentId]) map[p.parentId] = []
    map[p.parentId].push(p)
  })
  return map
})

const renderPosts = (parentId = null, depth = 0) => {
  const list = nestedPosts.value[parentId] || []
  return list.map((post) => ({
    ...post,
    replies: renderPosts(post.id, depth + 1),
    depth
  }))
}

onMounted(() => {
  fetchThread()
  fetchPosts()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-heading mb-4">{{ threadTitle }}</h1>

    <div v-for="post in renderPosts()" :key="post.id" :style="{ marginLeft: `${post.depth * 1.5}rem` }"
         class="bg-white border rounded p-3 mb-2">
      <div class="text-sm text-gray-500 mb-1">
        {{ post.author }} •
        {{
          post.createdAt
            ? new Date(post.createdAt).toLocaleDateString()
            : 'pending…'
        }}
      </div>
      <div class="text-gray-800 text-sm" v-html="sanitizeHTML(decryptText(post.content))" />

      <div class="flex gap-4 text-xs mt-2 text-gray-500">
        <button @click="replyingTo = post.id" class="hover:text-primary">Reply</button>
        <button @click="likePost(post.id, post.likes)" class="hover:text-primary">👍 {{ post.likes }}</button>
        <button
          v-if="store.isAdmin() || post.author === store.currentUser.email"
          @click="deletePost(post.id)"
          class="hover:text-red-500"
        >Delete</button>
      </div>
    </div>

    <div class="mt-6">
      <h2 class="font-bold mb-2 text-lg">Reply</h2>
      <textarea
        v-model="newReply"
        rows="4"
        class="textarea textarea-bordered w-full"
        placeholder="Write your message..."
      />
      <div class="mt-2 flex gap-2">
        <button class="btn btn-primary" @click="reply">Send</button>
        <button v-if="replyingTo" class="btn btn-outline" @click="replyingTo = null">
          Cancel reply
        </button>
      </div>
    </div>
  </div>
</template>
