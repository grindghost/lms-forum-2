// getThread.js
const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function getThread(threadId) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
  const res = await fetch(`${API_BASE}/forum?action=get-thread&threadId=${threadId}`)
  if (!res.ok) throw new Error('Failed to load thread')
  return await res.json()
} 