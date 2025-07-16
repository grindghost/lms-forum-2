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
          // Fetch post IDs for this thread
          const threadPostsSnap = await db.ref(`threads/${threadId}/postIds`).get();
          const postIdsObj = threadPostsSnap.val() || {};
          const postIds = Object.keys(postIdsObj);
          // Batch fetch posts
          const postsSnapArr = await Promise.all(postIds.map(id => db.ref(`posts/${id}`).get()));
          const allPosts = {};
          postsSnapArr.forEach((snap, i) => {
            if (snap.exists()) allPosts[postIds[i]] = snap.val();
          });
          // Collect all unique user IDs (authors + likedBy)
          const userIdsSet = new Set();
          Object.values(allPosts).forEach(post => {
            if (post.author) userIdsSet.add(post.author);
            if (post.likedBy) {
              Object.keys(post.likedBy).forEach(uid => userIdsSet.add(uid));
            }
          });
          const userIds = Array.from(userIdsSet);
          // Batch fetch only those user records
          const userSnaps = await Promise.all(userIds.map(uid => db.ref(`users/${uid}`).get()));
          const userMap = {};
          userSnaps.forEach((snap, i) => {
            if (snap.exists()) userMap[userIds[i]] = snap.val();
          });
          // Map authors and likedBy using the fetched user records
          const posts = Object.entries(allPosts)
            .map(([id, post]) => ({
              id,
              ...post,
              content: post.content ? decryptText(post.content) : post.content,
              author: post.author && userMap[post.author] ? JSON.parse(decryptText(userMap[post.author])) : null,
              likedBy: post.likedBy
                ? Object.keys(post.likedBy)
                    .map(uid => userMap[uid] ? JSON.parse(decryptText(userMap[uid])) : null)
                    .filter(Boolean)
                : [],
            }));
          return res.status(200).json(posts)
        }
        case 'get-all-posts': {
          const postsRef = db.ref('posts')
          const usersRef = db.ref('users')
          const snapshot = await postsRef.get()
          const allPosts = snapshot.val() || {}
          // Fetch all users for mapping user_id to decrypted user
          const usersSnap = await usersRef.get()
          const allUsers = usersSnap.val() || {}
          const posts = Object.entries(allPosts).map(([id, post]) => ({ id, ...post }))
            .map(post => ({
              ...post,
              content: post.content ? decryptText(post.content) : post.content,
              author: post.author && allUsers[post.author] ? JSON.parse(decryptText(allUsers[post.author])) : null,
              likedBy: post.likedBy ? Object.keys(post.likedBy).map(uid => allUsers[uid] ? JSON.parse(decryptText(allUsers[uid])) : null).filter(Boolean) : [],
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
          if (typeof author !== 'object' || !author.name || !author.email) {
            return res.status(400).json({ error: 'Invalid author object' })
          }
          // Compute user_id and encrypted user
          const user_id = toFirebaseKey(deterministicEncryptText(author.email))
          const encryptedUser = encryptText(JSON.stringify(author))
          // Store user in users/{user_id}
          await db.ref(`users/${user_id}`).set(encryptedUser)
          // Create post
          const postsRef = db.ref('posts')
          const newPostRef = await postsRef.push({
            threadId,
            parentId: parentId ?? null,
            content: encryptText(content),
            author: user_id,
            createdAt: Date.now(),
            likes: 0,
            likedBy: {},
            deleted: false
          })
          const postId = newPostRef.key
          // Atomic update: add postId to threads/{threadId}/postIds/{postId} = true
          await db.ref().update({ [`threads/${threadId}/postIds/${postId}`]: true })
          return res.status(200).json({ id: postId })
        }
        case 'like-post': {
          const { postId, userEmail } = req.body;
          if (!postId || !userEmail) return res.status(400).json({ error: 'Missing data' });
          // Compute user_id and encrypted user
          const user_id = toFirebaseKey(deterministicEncryptText(userEmail))
          // Optionally, you could require user data to update users/{user_id} here if available
          const postRef = db.ref(`posts/${postId}`);
          const postSnap = await postRef.get();
          const post = postSnap.val();
          let likedBy = post?.likedBy || {};
          let likes = typeof post?.likes === 'number' ? post.likes : 0;
          const hasLiked = !!likedBy[user_id];

          if (hasLiked) {
            delete likedBy[user_id];
            likes = Math.max(0, likes - 1);
          } else {
            likedBy[user_id] = true;
            likes = Object.keys(likedBy).length;
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
          // 1. Find the threadId for the post
          const postSnap = await db.ref(`posts/${postId}`).get()
          const post = postSnap.val()
          if (!post) return res.status(404).json({ error: 'Post not found' })
          const threadId = post.threadId

          // 2. Fetch only post IDs for this thread
          const postIdsObj = (await db.ref(`threads/${threadId}/postIds`).get()).val() || {}
          const postIds = Object.keys(postIdsObj)

          // 3. Batch fetch only those posts
          const postsSnapArr = await Promise.all(postIds.map(id => db.ref(`posts/${id}`).get()))
          const threadPosts = {}
          postsSnapArr.forEach((snap, i) => {
            if (snap.exists()) threadPosts[postIds[i]] = snap.val()
          })

          // 4. Recursively find all descendants
          const postsToDelete = new Set()
          function findReplies(parentId) {
            Object.entries(threadPosts).forEach(([id, post]) => {
              if (post.parentId === parentId) {
                postsToDelete.add(id)
                findReplies(id)
              }
            })
          }
          postsToDelete.add(postId)
          findReplies(postId)

          // 5. Prepare updates to delete posts and references
          const updates = {}
          for (const id of postsToDelete) {
            updates[`posts/${id}`] = null
            updates[`threads/${threadId}/postIds/${id}`] = null
          }
          await db.ref().update(updates)
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