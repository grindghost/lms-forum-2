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
            .map(post => ({
              ...post,
              content: post.content ? decryptText(post.content) : post.content,
              author: post.author ? safeParse(decryptText(post.author)) : post.author,
              likedBy: Array.isArray(post.likedBy) ? post.likedBy : []
            }));
          return res.status(200).json(posts)
        }
        case 'get-all-posts': {
          const postsRef = db.ref('posts')
          const snapshot = await postsRef.get()
          const allPosts = snapshot.val() || {}
          const posts = Object.entries(allPosts).map(([id, post]) => ({ id, ...post }))
            .map(post => ({
              ...post,
              content: post.content ? decryptText(post.content) : post.content,
              author: post.author ? safeParse(decryptText(post.author)) : post.author,
              likedBy: Array.isArray(post.likedBy) ? post.likedBy : []
            }));
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
            content: encryptText(content),
            author: encryptText(typeof author === 'string' ? author : JSON.stringify(author)),
            createdAt: Date.now(),
            likes: 0,
            likedBy: [],
            deleted: false
          })
          return res.status(200).json({ id: newPost.key })
        }
        case 'like-post': {
          const { postId, userEmail } = req.body;
          if (!postId || !userEmail) return res.status(400).json({ error: 'Missing data' });
          const postRef = db.ref(`posts/${postId}`);
          const postSnap = await postRef.get();
          const post = postSnap.val();
          let likedBy = Array.isArray(post?.likedBy) ? post.likedBy : [];
          let likes = typeof post?.likes === 'number' ? post.likes : 0;
          const hasLiked = likedBy.includes(userEmail);

          if (hasLiked) {
            likedBy = likedBy.filter(email => email !== userEmail);
            likes = Math.max(0, likes - 1);
          } else {
            likedBy = [...likedBy, userEmail];
            likes = likes + 1;
          }

          await postRef.update({ likes, likedBy });
          return res.status(200).json({ success: true, likes, likedBy });
        }
        case 'soft-delete-post': {
          const { postId } = req.body
          if (!postId) return res.status(400).json({ error: 'Missing postId' })
          const postRef = db.ref(`posts/${postId}`)
          await postRef.update({
            deleted: true
          })
          return res.status(200).json({ success: true })
        }
        case 'restore-post': {
          const { postId } = req.body
          if (!postId) return res.status(400).json({ error: 'Missing postId' })
          const postRef = db.ref(`posts/${postId}`)
          await postRef.update({
            deleted: false
          })
          return res.status(200).json({ success: true })
        }
        case 'update-post': {
          const { postId, content } = req.body
          if (!postId || !content) return res.status(400).json({ error: 'Missing postId or content' })
          const postRef = db.ref(`posts/${postId}`)
          await postRef.update({ content: encryptText(content) })
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