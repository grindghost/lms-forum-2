export async function createThread(payload) {
  const res = await fetch('/api/create-thread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to create thread')
  return await res.json()
}