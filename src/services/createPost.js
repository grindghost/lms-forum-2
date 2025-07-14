export async function createPost(payload) {
  const res = await fetch('/api/create-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Failed to create post')
  return await res.json()
}
