import { getFirebaseDB } from './_firebase'
import { ref, get, child, query, orderByChild, equalTo } from 'firebase-admin/database'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const groupId = req.query.groupId
    if (!groupId) return res.status(400).json({ error: 'Missing groupId' })

    const db = getFirebaseDB()
    const threadsRef = query(ref(db, 'threads'), orderByChild('groupId'), equalTo(groupId))
    const snapshot = await get(threadsRef)

    const threads = []
    snapshot.forEach((childSnap) => {
      threads.push({ id: childSnap.key, ...childSnap.val() })
    })

    return res.status(200).json(threads)
  } catch (error) {
    console.error('[get-threads] Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
