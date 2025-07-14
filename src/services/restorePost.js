export async function restorePost(payload) {
  const res = await fetch('/api/restore-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to restore post')
  return await res.json()
}