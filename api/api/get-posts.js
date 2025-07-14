import { getFirebaseDB } from './_firebase'
import { ref, get, query, orderByChild, equalTo } from 'firebase-admin/database'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const threadId = req.query.threadId
    if (!threadId) return res.status(400).json({ error: 'Missing threadId' })

    const db = getFirebaseDB()
    const postsRef = query(ref(db, 'posts'), orderByChild('threadId'), equalTo(threadId))
    const snapshot = await get(postsRef)

    const posts = []
    snapshot.forEach((childSnap) => {
      posts.push({ id: childSnap.key, ...childSnap.val() })
    })

    return res.status(200).json(posts)
  } catch (error) {
    console.error('[get-posts] Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
