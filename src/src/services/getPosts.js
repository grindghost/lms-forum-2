export async function getPosts(threadId) {
  const res = await fetch(`/api/get-posts?threadId=${threadId}`)
  if (!res.ok) throw new Error('Failed to load posts')
  return await res.json()
}