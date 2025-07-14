import { getFirebaseDB } from '../_firebase.js'

export default async function handler(req, res) {

    // CORS
    const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || []
    const origin = req.headers.origin

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return res.status(403).json({ error: 'Forbidden: invalid origin' })
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.setHeader('Vary', 'Origin')
      return res.status(200).end()
    }

    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')

  const db = getFirebaseDB()
  const { action } = req.query

  try {
    if (req.method === 'GET') {
      switch (action) {
        case 'get-threads': {
          const groupId = req.query.groupId
          if (!groupId) return res.status(400).json({ error: 'Missing groupId' })
          const threadsRef = db.ref('threads')
          const snapshot = await threadsRef.get()
          const allThreads = snapshot.val() || {}
          const threads = Object.entries(allThreads)
            .map(([id, thread]) => ({ id, ...thread }))
            .filter(thread => thread.group === groupId)
          return res.status(200).json(threads)
        }
        case 'get-thread': {
          const threadId = req.query.threadId
          if (!threadId) return res.status(400).json({ error: 'Missing threadId' })
          const threadSnap = await db.ref(`threads/${threadId}`).get()
          const thread = threadSnap.val()
          if (!thread) return res.status(404).json({ error: 'Thread not found' })
          return res.status(200).json({ id: threadId, ...thread })
        }
        default:
          return res.status(400).json({ error: 'Unknown action' })
      }
    } else if (req.method === 'POST') {
      switch (action) {
        case 'create-thread': {
          const { title, author, groupId } = req.body
          if (!title || !author || !groupId) return res.status(400).json({ error: 'Missing data' })
          const threadsRef = db.ref('threads')
          const newThread = await threadsRef.push({
            title,
            createdAt: Date.now(),
            author,
            group: groupId,
            sortOrder: Date.now()
          })
          return res.status(200).json({ id: newThread.key })
        }
        case 'update-thread': {
          const { id, title } = req.body
          if (!id || !title) return res.status(400).json({ error: 'Missing thread id or title' })
          await db.ref(`threads/${id}`).update({ title })
          return res.status(200).json({ success: true })
        }
        case 'delete-thread': {
          const { id } = req.body
          if (!id) return res.status(400).json({ error: 'Missing thread id' })
          await db.ref(`threads/${id}`).remove()
          return res.status(200).json({ success: true })
        }
        case 'update-sort-order': {
          const { updates } = req.body
          if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'Missing or invalid updates' })
          await db.ref().update(updates)
          return res.status(200).json({ success: true })
        }
        // Add more thread actions here (subscribe, reorder, etc.)
        default:
          return res.status(400).json({ error: 'Unknown action' })
      }
    } else {
      return res.status(405).end()
    }
  } catch (error) {
    console.error('[forum API] Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
} 