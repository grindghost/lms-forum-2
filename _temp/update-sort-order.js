// api/update-sort-order.js
import { getFirebaseDB } from './_firebase'
import { ref, update } from 'firebase-admin/database'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { threadOrder } = req.body

    if (!threadOrder || typeof threadOrder !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid threadOrder' })
    }

    const db = getFirebaseDB()
    const updates = {}

    for (const [threadId, sortOrder] of Object.entries(threadOrder)) {
      updates[`threads/${threadId}/sortOrder`] = sortOrder
    }

    await update(ref(db), updates)

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[update-sort-order] Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
