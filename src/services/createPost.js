// createPost.js
const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function createPost(payload) {
  const res = await fetch(`${API_BASE}/posts?action=create-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to create post')
  return await res.json()
}
