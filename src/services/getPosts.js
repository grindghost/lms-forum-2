// getPosts.js
const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function getPosts(threadId) {
  const res = await fetch(`${API_BASE}/posts?action=get-posts&threadId=${threadId}`)
  if (!res.ok) throw new Error('Failed to load posts')
  return await res.json()
}

export async function getAllPosts() {
  const res = await fetch(`${API_BASE}/posts?action=get-all-posts`)
  if (!res.ok) throw new Error('Failed to load posts')
  return await res.json()
}