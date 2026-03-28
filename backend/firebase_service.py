"""
Firebase Admin SDK helpers.
Initialises once and exposes the Firestore client.
"""
import os
import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_db():
    global _db
    if _db is not None:
        return _db

    sa_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', './serviceAccount.json')

    if not firebase_admin._apps:
        if os.path.exists(sa_path):
            cred = credentials.Certificate(sa_path)
        else:
            # Fall back to Application Default Credentials (e.g. in GCP / CI)
            cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)

    _db = firestore.client()
    return _db
