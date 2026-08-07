import { auth, firestoreDb } from './firebaseConfig';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { db } from './index';
import { Category, Goal, Entry, MetaSettings } from '../types';

let currentUser: any = null;
let isSyncing = false;

// Initialize Firebase Auth (Anonymous login for zero-friction launch)
export const initFirebaseAuthAndSync = (onUserChanged?: (user: any) => void) => {
  onAuthStateChanged(auth, async (user: any) => {
    if (user) {
      currentUser = user;
      if (onUserChanged) onUserChanged(user);
      // Perform initial background sync on auth ready
      await pullCloudDataToLocal(user.uid);
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
};

export const getCurrentUser = () => currentUser;

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
        await db.meta.put({ key: 'settings', value: settingsData });
      }
    }
  } catch (err) {
    console.warn('Cloud data pull deferred:', err);
  } finally {
    isSyncing = false;
  }
};
