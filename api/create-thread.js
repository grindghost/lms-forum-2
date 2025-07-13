import { getFirebaseDB } from './_firebase'
import { ref, push, serverTimestamp } from 'firebase-admin/database'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { title, author, groupId } = req.body
    if (!title || !author || !groupId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const db = getFirebaseDB()
    const threadsRef = ref(db, 'threads')
    const newThread = await push(threadsRef, {
      title,
      createdAt: serverTimestamp(),
      author,
      groupId,
    })

    return res.status(200).json({ id: newThread.key })
  } catch (error) {
    console.error('[create-thread] Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
