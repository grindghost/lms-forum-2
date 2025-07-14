import { getFirebaseDB } from '../_firebase.js'

export default async function handler(req, res) {

    const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || []
    const origin = req.headers.origin

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return res.status(403).json({ error: 'Forbidden: invalid origin' })
    }
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')

    const db = getFirebaseDB()
    const postsRef = db.ref('posts')

    // ✅ Admin SDK uses .get() on the ref object
    const snapshot = await postsRef.get()
    const data = snapshot.val()

    return res.status(200).json({ posts: data })
}