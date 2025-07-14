// getThreads.js

const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function getThreads(groupId) {
  const res = await fetch(`${API_BASE}/forum?action=get-threads&groupId=${groupId}`)
  if (!res.ok) throw new Error('Failed to load threads')
  return await res.json()
}
