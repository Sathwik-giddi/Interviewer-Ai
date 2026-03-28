import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDqi-79nNH4ItXKifZxzeeaypL5lv5Ikbg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'interviwer-9ef9c.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'interviwer-9ef9c',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'interviwer-9ef9c.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '146274646997',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:146274646997:web:5447c0ddf27e9c9078db5c',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-GC637HQRHK',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
