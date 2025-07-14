// createThread.js
const API_BASE = import.meta.env.VITE_API_BASE_URL  

export async function createThread(payload) {
  const res = await fetch(`${API_BASE}/forum?action=create-thread`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to create thread')
  return await res.json()
}