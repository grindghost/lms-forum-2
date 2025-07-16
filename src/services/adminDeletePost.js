// adminDeletePost.js
const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function adminDeletePost(payload) {
  const res = await fetch(`${API_BASE}/posts?action=admin-delete-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to permanently delete post')
  return await res.json()
}