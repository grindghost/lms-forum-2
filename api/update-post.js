import { getFirebaseDB } from './_firebase'
import { ref, update, serverTimestamp } from 'firebase-admin/database'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end()

  try {
    const { id, content } = req.body
    if (!id || !content) return res.status(400).json({ error: 'Missing id or content' })

    const db = getFirebaseDB()
    const postRef = ref(db, `posts/${id}`)
    await update(postRef, {
      content,
      createdAt: serverTimestamp(),
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[update-post] Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
