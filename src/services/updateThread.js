export async function updateThread(payload) {
  const res = await fetch('/api/update-thread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to update thread')
  return await res.json()
}