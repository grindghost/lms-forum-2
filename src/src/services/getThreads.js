// getThreads.js
export async function getThreads(groupId) {
  const res = await fetch(`/api/get-threads?groupId=${groupId}`)
  return await res.json()
}
