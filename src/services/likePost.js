export async function likePost(payload) {
  const res = await fetch('/api/like-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to toggle like')
  return await res.json()
}