export async function updateSortOrder(payload) {
  const res = await fetch('/api/update-sort-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to update sort order')
  return await res.json()
}