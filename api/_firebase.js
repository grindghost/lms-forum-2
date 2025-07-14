// ✅ Firebase Admin Setup Helper
// api/_firebase.js
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'


let dbInstance = null

export function getFirebaseDB() {
  if (!dbInstance) {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FB_PROJECT_ID,
          clientEmail: process.env.FB_CLIENT_EMAIL,
          privateKey: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FB_DATABASE_URL,
      })
    }
    dbInstance = getDatabase()
  }
  return dbInstance
}