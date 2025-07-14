import { getFirebaseDB } from '../_firebase.js'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { encryptText, decryptText } = require('../utils/encryption.cjs');

function safeParse(str) {
  try { return JSON.parse(str); } catch { return { name: '', email: '' }; }
}

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
            .map(thread => ({ ...thread, author: thread.author ? safeParse(decryptText(thread.author)) : thread.author }));
          return res.status(200).json(threads)
        }
        case 'get-thread': {
          const threadId = req.query.threadId
          if (!threadId) return res.status(400).json({ error: 'Missing threadId' })
          const threadSnap = await db.ref(`threads/${threadId}`).get()
          const thread = threadSnap.val()
          if (!thread) return res.status(404).json({ error: 'Thread not found' })
          return res.status(200).json({ id: threadId, ...thread, author: thread.author ? safeParse(decryptText(thread.author)) : thread.author })
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
            author: encryptText(author),
            group: groupId,
            sortOrder: Date.now()
          })
          return res.status(200).json({ id: newThread.key })
        }
        case 'update-thread': {
          const { id, title, readOnly } = req.body
          if (!id) return res.status(400).json({ error: 'Missing thread id' })
          const updateData = {}
          if (title !== undefined) updateData.title = title
          if (readOnly !== undefined) updateData.readOnly = readOnly
          if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update' })
          }
          await db.ref(`threads/${id}`).update(updateData)
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
        case 'toggle-subscription': {
          const { threadId, userEmail } = req.body
          if (!threadId || !userEmail) return res.status(400).json({ error: 'Missing threadId or userEmail' })
          const threadRef = db.ref(`threads/${threadId}/subscribers`)
          const snap = await threadRef.get()
          let subscribers = snap.val() || []
          if (!Array.isArray(subscribers)) subscribers = []
          if (subscribers.includes(encryptText(userEmail))) {
            // Unsubscribe
            subscribers = subscribers.filter(e => e !== encryptText(userEmail))
          } else {
            // Subscribe
            subscribers.push(encryptText(userEmail))
          }
          await threadRef.set(subscribers)
          return res.status(200).json({ subscribers })
        }
        case 'update-subscribers': {
          const { threadId, subscribers } = req.body
          if (!threadId || !Array.isArray(subscribers)) return res.status(400).json({ error: 'Missing threadId or subscribers' })
          // Encrypt all subscribers before saving
          const encryptedSubscribers = subscribers.map(email => encryptText(email))
          await db.ref(`threads/${threadId}/subscribers`).set(encryptedSubscribers)
          return res.status(200).json({ subscribers: encryptedSubscribers })
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