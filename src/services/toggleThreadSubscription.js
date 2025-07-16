// src/services/toggleThreadSubscription.js
const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function toggleThreadSubscription({ threadId, userEmail }) {
  const res = await fetch(`${API_BASE}/forum?action=toggle-subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, userEmail })
  })
  if (!res.ok) throw new Error('Failed to update subscription')
  return await res.json()
} 