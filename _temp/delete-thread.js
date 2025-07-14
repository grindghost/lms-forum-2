// api/delete-thread.js
import { getFirebaseDB } from './_firebase'
import { ref, update } from 'firebase-admin/database'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end()

  try {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'Missing thread id' })

    const db = getFirebaseDB()
    const threadRef = ref(db, `threads/${id}`)
    await update(threadRef, { deleted: true })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[delete-thread] Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
