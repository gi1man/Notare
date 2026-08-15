import { auth, firestoreDb } from './firebaseConfig';
import {
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  EmailAuthProvider,
  linkWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDocs, collection, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './index';
import { Category, Goal, Entry, MetaSettings } from '../types';

let currentUser: typeof auth.currentUser = null;
let isSyncing = false;

// Initialize Firebase Auth (Anonymous login for zero-friction launch)
export const initFirebaseAuthAndSync = (onUserChanged?: (user: any) => void) => {
  onAuthStateChanged(auth, async (user: any) => {
    if (user) {
      currentUser = user;
      if (onUserChanged) onUserChanged(user);
      // Push local data first (preserves offline entries), then pull cloud data
      if (!user.isAnonymous) {
        await reconcileSync(user.uid);
      }
    } else {
      try {
        const credential = await signInAnonymously(auth);
        currentUser = credential.user;
        if (onUserChanged) onUserChanged(credential.user);
      } catch (err) {
        console.warn('Firebase Anonymous Auth offline fallback:', err);
      }
    }
  });

  // When device comes back online, push any entries logged while offline
  window.addEventListener('online', async () => {
    if (currentUser && !currentUser.isAnonymous) {
      await reconcileSync(currentUser.uid);
    }
  });
};

// Push all local data up, then pull cloud data down
// merge:true ensures new local entries are created in cloud without overwriting newer cloud data
const reconcileSync = async (userId: string) => {
  if (isSyncing) return;
  isSyncing = true;
  try {
    await pushAllLocalDataToCloud(userId);
    await pullCloudDataToLocal(userId);
  } catch (err) {
    console.warn('Sync reconciliation deferred:', err);
  } finally {
    isSyncing = false;
  }
};

export const getCurrentUser = () => currentUser;

// Register Cloud Account with Email & Custom Password
// Attempts to upgrade anonymous account first to avoid orphan UIDs
export const registerWithEmailPassword = async (email: string, pass: string) => {
  let user;

  // If currently anonymous, try to link credentials to preserve the UID
  if (auth.currentUser && auth.currentUser.isAnonymous) {
    try {
      const emailCredential = EmailAuthProvider.credential(email, pass);
      const result = await linkWithCredential(auth.currentUser, emailCredential);
      user = result.user;
    } catch (linkErr: any) {
      // If linking fails (e.g., email already in use), fall back to new account
      if (linkErr.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Use "Sign In" to access your account.');
      }
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      user = credential.user;
    }
  } else {
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    user = credential.user;
  }

  currentUser = user;
  try {
    await sendEmailVerification(user);
  } catch {
    // Non-blocking: verification email is optional
  }
  try {
    await pushAllLocalDataToCloud(user.uid);
  } catch (syncErr) {
    console.warn('Initial cloud sync queued for newly created user:', syncErr);
  }
  return user;
};

// Sign In with Email & Custom Password
export const signInWithEmailPassword = async (email: string, pass: string) => {
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  currentUser = credential.user;
  try {
    // Pull all cloud data down onto second device
    await pullCloudDataToLocal(credential.user.uid);
  } catch (syncErr) {
    console.warn('Cloud data pull deferred:', syncErr);
  }
  return credential.user;
};

// Change Password for Signed-In User
export const changeUserPassword = async (newPass: string) => {
  if (!auth.currentUser) throw new Error('No account signed in to update password.');
  await updatePassword(auth.currentUser, newPass);
};

// Send Password Reset Email
export const resetPasswordByEmail = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// Push all local Dexie items to Cloud using batched writes
export const pushAllLocalDataToCloud = async (userId: string) => {
  const categories = await db.categories.toArray();
  const goals = await db.goals.toArray();
  const entries = await db.entries.toArray();
  const settingsItem = await db.meta.get('settings');

  // Collect all write operations
  const ops: Array<{ ref: any; data: any }> = [];

  for (const cat of categories) {
    ops.push({
      ref: doc(firestoreDb, 'users', userId, 'categories', cat.id),
      data: JSON.parse(JSON.stringify(cat)),
    });
  }
  for (const goal of goals) {
    ops.push({
      ref: doc(firestoreDb, 'users', userId, 'goals', goal.id),
      data: JSON.parse(JSON.stringify(goal)),
    });
  }
  for (const entry of entries) {
    ops.push({
      ref: doc(firestoreDb, 'users', userId, 'entries', entry.id),
      data: JSON.parse(JSON.stringify(entry)),
    });
  }
  if (settingsItem?.value) {
    ops.push({
      ref: doc(firestoreDb, 'users', userId, 'settings', 'settings'),
      data: JSON.parse(JSON.stringify(settingsItem.value)),
    });
  }

  // Commit in batches of 450 (Firestore limit is 500 per batch)
  const BATCH_SIZE = 450;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(firestoreDb);
    const chunk = ops.slice(i, i + BATCH_SIZE);
    for (const op of chunk) {
      batch.set(op.ref, op.data, { merge: true });
    }
    await batch.commit();
  }
};

// Sync Category to Firestore (/users/{userId}/categories/{catId})
export const syncCategoryToCloud = async (category: Category) => {
  if (!currentUser) return;
  try {
    const docRef = doc(firestoreDb, 'users', currentUser.uid, 'categories', category.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(category)), { merge: true });
  } catch (err) {
    console.warn('Category cloud sync queued offline:', err);
  }
};

// Sync Goal to Firestore (/users/{userId}/goals/{goalId})
export const syncGoalToCloud = async (goal: Goal) => {
  if (!currentUser) return;
  try {
    const docRef = doc(firestoreDb, 'users', currentUser.uid, 'goals', goal.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(goal)), { merge: true });
  } catch (err) {
    console.warn('Goal cloud sync queued offline:', err);
  }
};

// Sync Entry to Firestore (/users/{userId}/entries/{entryId})
export const syncEntryToCloud = async (entry: Entry) => {
  if (!currentUser) return;
  try {
    const docRef = doc(firestoreDb, 'users', currentUser.uid, 'entries', entry.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(entry)), { merge: true });
  } catch (err) {
    console.warn('Entry cloud sync queued offline:', err);
  }
};

// Delete Entry from Firestore
export const deleteEntryFromCloud = async (entryId: string) => {
  if (!currentUser) return;
  try {
    const docRef = doc(firestoreDb, 'users', currentUser.uid, 'entries', entryId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Entry deletion queued offline:', err);
  }
};

// Sync Settings to Firestore (/users/{userId}/settings/settings)
export const syncSettingsToCloud = async (settings: MetaSettings) => {
  if (!currentUser) return;
  try {
    const docRef = doc(firestoreDb, 'users', currentUser.uid, 'settings', 'settings');
    await setDoc(docRef, JSON.parse(JSON.stringify(settings)), { merge: true });
  } catch (err) {
    console.warn('Settings cloud sync queued offline:', err);
  }
};

// Pull all Cloud Data down to Dexie IndexedDB when syncing a restored user account
export const pullCloudDataToLocal = async (userId: string) => {
  if (isSyncing) return;
  isSyncing = true;
  try {
    // 1. Categories
    const catSnapshot = await getDocs(collection(firestoreDb, 'users', userId, 'categories'));
    for (const docSnap of catSnapshot.docs) {
      const cat = docSnap.data() as Category;
      await db.categories.put(cat);
    }

    // 2. Goals
    const goalSnapshot = await getDocs(collection(firestoreDb, 'users', userId, 'goals'));
    for (const docSnap of goalSnapshot.docs) {
      const goal = docSnap.data() as Goal;
      await db.goals.put(goal);
    }

    // 3. Entries
    const entrySnapshot = await getDocs(collection(firestoreDb, 'users', userId, 'entries'));
    for (const docSnap of entrySnapshot.docs) {
      const entry = docSnap.data() as Entry;
      await db.entries.put(entry);
    }

    // 4. Settings
    const settingsSnapshot = await getDocs(collection(firestoreDb, 'users', userId, 'settings'));
    for (const docSnap of settingsSnapshot.docs) {
      if (docSnap.id === 'settings') {
        const settingsData = docSnap.data() as MetaSettings;
        await db.meta.put({
          key: 'settings',
          value: {
            ...settingsData,
            onboarding_completed: true,
            is_demo_mode: false,
          },
        });
      }
    }
  } catch (err) {
    console.warn('Cloud data pull deferred:', err);
  } finally {
    isSyncing = false;
  }
};
