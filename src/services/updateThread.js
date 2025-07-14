// updateThread.js
const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function updateThread(payload) {
  const res = await fetch(`${API_BASE}/forum?action=update-thread`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to update thread')
  return await res.json()
}