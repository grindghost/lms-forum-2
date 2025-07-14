import { getFirebaseDB } from '../_firebase.js'

export default async function handler(req, res) {

    // CORS
    const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || []
    const origin = req.headers.origin

    if (!ALLOWED_ORIGINS.includes(origin)) {
        return res.status(403).json({ error: 'Forbidden: invalid origin' })
    }

    if (req.method === 'OPTIONS') {
      // CORS preflight
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
        case 'get-posts': {
          const threadId = req.query.threadId
          if (!threadId) return res.status(400).json({ error: 'Missing threadId' })
          const postsRef = db.ref('posts')
          const snapshot = await postsRef.get()
          const allPosts = snapshot.val() || {}
          const posts = Object.entries(allPosts)
            .map(([id, post]) => ({ id, ...post }))
            .filter(post => post.threadId === threadId)
          return res.status(200).json(posts)
        }
        case 'get-all-posts': {
          const postsRef = db.ref('posts')
          const snapshot = await postsRef.get()
          const allPosts = snapshot.val() || {}
          const posts = Object.entries(allPosts).map(([id, post]) => ({ id, ...post }))
          return res.status(200).json(posts)
        }
        default:
          return res.status(400).json({ error: 'Unknown action' })
      }
    } else if (req.method === 'POST') {
      switch (action) {
        case 'create-post': {
          const { threadId, parentId, content, author } = req.body
          if (!threadId || !content || !author) return res.status(400).json({ error: 'Missing data' })
          const postsRef = db.ref('posts')
          const newPost = await postsRef.push({
            threadId,
            parentId: parentId ?? null,
            content,
            author,
            createdAt: Date.now(),
            likes: 0,
            likedBy: [],
            deleted: false
          })
          return res.status(200).json({ id: newPost.key })
        }
        case 'like-post': {
          const { postId, userEmail, likedBy, currentLikes } = req.body
          if (!postId || !userEmail || !Array.isArray(likedBy)) return res.status(400).json({ error: 'Missing data' })
          const postRef = db.ref(`posts/${postId}`)
          const hasLiked = likedBy.includes(userEmail)
          if (hasLiked) {
            await postRef.update({
              likes: Math.max(0, (currentLikes || 1) - 1),
              likedBy: likedBy.filter(email => email !== userEmail)
            })
          } else {
            await postRef.update({
              likes: (currentLikes || 0) + 1,
              likedBy: [...likedBy, userEmail]
            })
          }
          return res.status(200).json({ success: true })
        }
        case 'soft-delete-post': {
          const { postId, content } = req.body
          if (!postId || !content) return res.status(400).json({ error: 'Missing data' })
          const postRef = db.ref(`posts/${postId}`)
          await postRef.update({
            originalContent: content,
            content: '[deleted]',
            deleted: true
          })
          return res.status(200).json({ success: true })
        }
        case 'restore-post': {
          const { postId, originalContent } = req.body
          if (!postId) return res.status(400).json({ error: 'Missing postId' })
          const postRef = db.ref(`posts/${postId}`)
          if (originalContent) {
            await postRef.update({
              content: originalContent,
              deleted: false,
              originalContent: null
            })
          } else {
            await postRef.update({
              deleted: false
            })
          }
          return res.status(200).json({ success: true })
        }
        case 'update-post': {
          const { postId, content } = req.body
          if (!postId || !content) return res.status(400).json({ error: 'Missing postId or content' })
          const postRef = db.ref(`posts/${postId}`)
          await postRef.update({ content })
          return res.status(200).json({ success: true })
        }
        case 'admin-delete-post': {
          const { postId } = req.body
          if (!postId) return res.status(400).json({ error: 'Missing postId' })
          const postsSnapshot = await db.ref('posts').get()
          const allPosts = postsSnapshot.val() || {}
          const postsToDelete = new Set()
          const findReplies = (parentId) => {
            Object.entries(allPosts).forEach(([id, post]) => {
              if (post.parentId === parentId) {
                postsToDelete.add(id)
                findReplies(id)
              }
            })
          }
          postsToDelete.add(postId)
          findReplies(postId)
          await Promise.all(Array.from(postsToDelete).map(id => db.ref(`posts/${id}`).remove()))
          return res.status(200).json({ success: true, deleted: Array.from(postsToDelete) })
        }
        default:
          return res.status(400).json({ error: 'Unknown action' })
      }
    } else {
      return res.status(405).end()
    }
  } catch (error) {
    console.error('[posts API] Error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
} 