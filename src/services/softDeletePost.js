export async function softDeletePost(payload) {
  const res = await fetch('/api/soft-delete-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to delete post')
  return await res.json()
}