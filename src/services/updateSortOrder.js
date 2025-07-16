// updateSortOrder.js
const API_BASE = import.meta.env.VITE_API_BASE_URL

export async function updateSortOrder(payload) {
  const res = await fetch(`${API_BASE}/forum?action=update-sort-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to update sort order')
  return await res.json()
}