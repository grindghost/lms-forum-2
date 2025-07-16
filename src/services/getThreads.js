// getThreads.js

const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function getThreads(groupId, currentUser) {
  const currentUserParam = currentUser ? `&currentUser=${encodeURIComponent(JSON.stringify(currentUser))}` : '';
  const res = await fetch(`${API_BASE}/forum?action=get-threads&groupId=${groupId}${currentUserParam}`)
  if (!res.ok) throw new Error('Failed to load threads')
  return await res.json()
}
