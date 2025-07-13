// api/soft-delete-post.js
import { getFirebaseDB } from './_firebase'
import { ref, update } from 'firebase-admin/database'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'Missing post id' })

    const db = getFirebaseDB()
    const postRef = ref(db, `posts/${id}`)

    await update(postRef, {
      deleted: true,
      deletedAt: Date.now(),
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[soft-delete-post] Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
