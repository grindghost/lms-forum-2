import { getFirebaseDB } from './_firebase'
import { ref, push, serverTimestamp } from 'firebase-admin/database'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { threadId, content, author } = req.body
    if (!threadId || !content || !author) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const db = getFirebaseDB()
    const postsRef = ref(db, 'posts')
    const newPost = await push(postsRef, {
      threadId,
      content,
      author,
      createdAt: serverTimestamp(),
    })

    return res.status(200).json({ id: newPost.key })
  } catch (error) {
    console.error('[create-post] Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
