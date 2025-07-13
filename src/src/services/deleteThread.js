export async function deleteThread(payload) {
  const res = await fetch('/api/delete-thread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to delete thread')
  return await res.json()
}
