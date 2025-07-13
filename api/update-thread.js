// api/update-thread.js
import { getFirebaseDB } from './_firebase'
import { ref, update, serverTimestamp } from 'firebase-admin/database'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { threadId, updates } = req.body

    if (!threadId || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Missing threadId or updates object' })
    }

    const db = getFirebaseDB()

    // Add server-side timestamp
    updates.updatedAt = serverTimestamp()

    await update(ref(db, `threads/${threadId}`), updates)

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[update-thread] Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
