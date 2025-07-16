import { getFirebaseDB } from '../_firebase.js'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { encryptText, decryptText, deterministicEncryptText, toFirebaseKey } = require('../utils/encryption.cjs');

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

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const db = getFirebaseDB()
  const { action } = req.query

  try {
    if (req.method === 'GET') {
      switch (action) {
        case 'get-threads': {
          const groupId = req.query.groupId
          if (!groupId) return res.status(400).json({ error: 'Missing groupId' })
          const threadsRef = db.ref('threads')
          const usersRef = db.ref('users')
          const snapshot = await threadsRef.get()
          const allThreads = snapshot.val() || {}
          // Fetch all users for mapping user_id to decrypted user
          const usersSnap = await usersRef.get()
          const allUsers = usersSnap.val() || {}
          const threads = Object.entries(allThreads)
            .map(([id, thread]) => ({ id, ...thread }))
            .filter(thread => thread.forumId === groupId)
            .map(thread => ({
              ...thread,
              author: thread.author && allUsers[thread.author] ? JSON.parse(decryptText(allUsers[thread.author])) : null,
              subscribers: thread.subscribers ? Object.keys(thread.subscribers).map(uid => allUsers[uid] ? JSON.parse(decryptText(allUsers[uid])) : null).filter(Boolean) : []
            }));
          return res.status(200).json(threads)
        }
        case 'get-thread': {
          const threadId = req.query.threadId
          if (!threadId) return res.status(400).json({ error: 'Missing threadId' })
          const threadSnap = await db.ref(`threads/${threadId}`).get()
          const thread = threadSnap.val()
          if (!thread) return res.status(404).json({ error: 'Thread not found' })
          // Fetch users for author and subscribers
          const usersSnap = await db.ref('users').get()
          const allUsers = usersSnap.val() || {}
          return res.status(200).json({
            id: threadId,
            ...thread,
            author: thread.author && allUsers[thread.author] ? JSON.parse(decryptText(allUsers[thread.author])) : null,
            subscribers: thread.subscribers ? Object.keys(thread.subscribers).map(uid => allUsers[uid] ? JSON.parse(decryptText(allUsers[uid])) : null).filter(Boolean) : []
          })
        }
        default:
          return res.status(400).json({ error: 'Unknown action' })
      }
    } else if (req.method === 'POST') {
      switch (action) {
        case 'create-thread': {
          const { title, author, forumId: rawForumId, groupId } = req.body
          const forumId = rawForumId || groupId
          if (!title || !author || !forumId) return res.status(400).json({ error: 'Missing data' })
          if (typeof author !== 'object' || !author.name || !author.email) {
            return res.status(400).json({ error: 'Invalid author object' })
          }
          // Compute user_id and encrypted user
          const user_id = toFirebaseKey(deterministicEncryptText(author.email))
          const encryptedUser = encryptText(JSON.stringify(author))
          // Store user in users/{user_id}
          await db.ref(`users/${user_id}`).set(encryptedUser)
          // Create thread
          const threadsRef = db.ref('threads')
          const newThreadRef = await threadsRef.push({
            title,
            createdAt: Date.now(),
            author: user_id,
            forumId,
            group: forumId, // for backward compatibility
            sortOrder: Date.now(),
            subscribers: { [user_id]: true },
            postIds: {}
          })
          const threadId = newThreadRef.key
          // Add threadId to forums/{forumId}/threadIds/{threadId} = true
          await db.ref(`forums/${forumId}/threadIds/${threadId}`).set(true)
          // Add user_id to threads/{threadId}/subscribers/{user_id} = true (already set above)
          return res.status(200).json({ id: threadId })
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
          console.log('TOGGLE SUBSCRIPTION HIT', req.body);
          const { threadId, userEmail } = req.body
          if (!threadId || !userEmail) return res.status(400).json({ error: 'Missing threadId or userEmail' })
          const threadRef = db.ref(`threads/${threadId}/subscribers`)
          const snap = await threadRef.get()
          let subscribers = snap.val() || []
          if (!Array.isArray(subscribers)) subscribers = []
          if (subscribers.includes(userEmail)) {
            // Unsubscribe
            subscribers = subscribers.filter(e => e !== userEmail)
          } else {
            // Subscribe
            subscribers.push(userEmail)
          }
          await threadRef.set(subscribers)
          return res.status(200).json({ subscribers })
        }
        case 'update-subscribers': {
          console.log('UPDATE SUBSCRIPTION HIT', req.body);
          
          const { threadId, subscribers } = req.body
          if (!threadId || !Array.isArray(subscribers)) return res.status(400).json({ error: 'Missing threadId or subscribers' })

          // Store all subscribers as plain emails for easier inspection
          await db.ref(`threads/${threadId}/subscribers`).set(subscribers)
          return res.status(200).json({ subscribers })
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