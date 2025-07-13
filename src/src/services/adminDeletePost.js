export async function adminDeletePost(payload) {
  const res = await fetch('/api/admin-delete-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to permanently delete post')
  return await res.json()
}