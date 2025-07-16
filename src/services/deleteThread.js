// deleteThread.js
const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function deleteThread(payload) {
  const res = await fetch(`${API_BASE}/forum?action=delete-thread`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to delete thread')
  return await res.json()
}
