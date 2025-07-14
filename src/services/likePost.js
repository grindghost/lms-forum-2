// likePost.js
const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function likePost(payload) {
  const res = await fetch(`${API_BASE}/posts?action=like-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to toggle like')
  return await res.json()
}