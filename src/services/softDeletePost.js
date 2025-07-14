// softDeletePost.js
const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function softDeletePost(payload) {
  const res = await fetch(`${API_BASE}/posts?action=soft-delete-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to delete post')
  return await res.json()
}