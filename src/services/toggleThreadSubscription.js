// src/services/toggleThreadSubscription.js
const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function updateThreadSubscribers({ threadId, subscribers }) {
  const res = await fetch(`${API_BASE}/forum?action=update-subscribers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, subscribers })
  })
  if (!res.ok) throw new Error('Failed to update subscribers')
  return await res.json()
} 