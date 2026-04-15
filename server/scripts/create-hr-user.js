#!/usr/bin/env node
'use strict'

require('dotenv').config()
const admin = require('firebase-admin')

const args = process.argv.slice(2)

if (args.length < 2) {
  console.error('Usage: node create-hr-user.js <email> <password> [--role <role>]')
  console.error('  email:    Email address for the new user')
  console.error('  password: Password (min 6 characters)')
  console.error('  --role:   Role to assign (default: hr)')
  process.exit(1)
}

const email = args[0]
const password = args[1]
const roleIdx = args.indexOf('--role')
const role = roleIdx !== -1 && args[roleIdx + 1] ? args[roleIdx + 1] : 'hr'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  console.error('Error: Invalid email format.')
  process.exit(1)
}

if (password.length < 6) {
  console.error('Error: Password must be at least 6 characters.')
  process.exit(1)
}

if (!['hr', 'candidate', 'admin'].includes(role)) {
  console.error('Error: Role must be one of: hr, candidate, admin')
  process.exit(1)
}

const FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccount.json'

if (!admin.apps.length) {
  try {
    const fs = require('fs')
    if (fs.existsSync(FIREBASE_SERVICE_ACCOUNT_PATH)) {
      const serviceAccount = require(FIREBASE_SERVICE_ACCOUNT_PATH)
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault() })
    }
  } catch (err) {
    console.error('Error: Failed to initialize Firebase Admin SDK:', err.message)
    process.exit(1)
  }
}

async function main() {
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: email.split('@')[0],
    })

    console.log(`[Auth] User created: ${userRecord.uid} (${email})`)

    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      role,
      createdAt: new Date().toISOString(),
    })

    console.log(`[Firestore] Role "${role}" set for ${userRecord.uid}`)
    console.log(`Done! User ${email} created with role: ${role}`)
    process.exit(0)
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      console.error('Error: A user with this email already exists.')
      console.error('To update an existing user, use the Firebase Console or Admin SDK directly.')
    } else {
      console.error('Error:', err.message)
    }
    process.exit(1)
  }
}

main()
