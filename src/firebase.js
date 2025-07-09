import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdAEmFJYNUuOOVwnC_N2KJDHJW12MGXkg",
  authDomain: "lms-forum-2.firebaseapp.com",
  projectId: "lms-forum-2",
  storageBucket: "lms-forum-2.firebasestorage.app",
  messagingSenderId: "728321182852",
  appId: "1:728321182852:web:671da9f0b4487e24c686d1"
};


const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

export { db }
