## 🔐 Firebase Admin Setup on Vercel

This project uses the `firebase-admin` SDK to interact with Firebase Realtime Database securely from server-side code (e.g. API routes). To configure it properly on **Vercel**, follow these steps:

---

### ✅ Required Environment Variables

Add the following environment variables to your Vercel project (under **Project Settings > Environment Variables**):

| Key               | Example / Notes                          |
|-------------------|------------------------------------------|
| `FB_PROJECT_ID`   | e.g. `my-firebase-project-id`            |
| `FB_CLIENT_EMAIL` | e.g. `firebase-adminsdk-xxx@...`         |
| `FB_PRIVATE_KEY`  | Paste from service account JSON (see below) |
| `FB_DATABASE_URL` | e.g. `https://my-project.firebaseio.com` |

---

### 🧪 Setting `FB_PRIVATE_KEY` Correctly

1. From your Firebase **service account JSON**, copy the value of the `private_key` field:

   ```json
   "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEv...snip...\n-----END PRIVATE KEY-----\n"
