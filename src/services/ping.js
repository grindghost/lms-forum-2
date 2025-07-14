const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function ping(threadId) {
  const res = await fetch(`${API_BASE}/ping`)
  if (!res.ok) throw new Error('Failed to load posts')
  return await res.json()
}