import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import config from '../../firebase-applet-config.json';
import { PadelMatch, PlayerProfile, ClubThemeConfig } from '../types';

const app = initializeApp(config);
export const db = getFirestore(app, config.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Subscriptions & CRUD for Matches
export function subscribeToMatches(onUpdate: (matches: PadelMatch[]) => void, onError?: (error: Error) => void) {
  const matchesRef = collection(db, 'matches');
  return onSnapshot(matchesRef, (snapshot) => {
    const matches: PadelMatch[] = [];
    snapshot.forEach((docSnap) => {
      matches.push({ ...docSnap.data(), id: docSnap.id } as PadelMatch);
    });
    // Sort descending by date
    matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate(matches);
  }, (err) => {
    console.error('Error fetching online matches:', err);
    if (onError) onError(err);
  });
}

export async function saveMatchToFirestore(match: PadelMatch): Promise<void> {
  const matchRef = doc(db, 'matches', match.id);
  // Clean undefined values before writing to Firestore
  const cleanData = JSON.parse(JSON.stringify(match));
  await setDoc(matchRef, cleanData, { merge: true });
}

export async function deleteMatchFromFirestore(matchId: string): Promise<void> {
  const matchRef = doc(db, 'matches', matchId);
  await deleteDoc(matchRef);
}

// Subscriptions & CRUD for Player Profiles
export function subscribeToPlayerProfiles(onUpdate: (profiles: PlayerProfile[]) => void, onError?: (error: Error) => void) {
  const profilesRef = collection(db, 'playerProfiles');
  return onSnapshot(profilesRef, (snapshot) => {
    const profiles: PlayerProfile[] = [];
    snapshot.forEach((docSnap) => {
      profiles.push({ ...docSnap.data(), id: docSnap.id } as PlayerProfile);
    });
    onUpdate(profiles);
  }, (err) => {
    console.error('Error fetching player profiles:', err);
    if (onError) onError(err);
  });
}

export async function savePlayerProfileToFirestore(profile: PlayerProfile): Promise<void> {
  const profileRef = doc(db, 'playerProfiles', profile.id);
  const cleanData = JSON.parse(JSON.stringify(profile));
  await setDoc(profileRef, cleanData, { merge: true });
}

export async function deletePlayerProfileFromFirestore(profileId: string): Promise<void> {
  const profileRef = doc(db, 'playerProfiles', profileId);
  await deleteDoc(profileRef);
}

// Subscriptions & CRUD for Club Theme Settings
export function subscribeToClubTheme(onUpdate: (theme: ClubThemeConfig) => void, onError?: (error: Error) => void) {
  const settingsDocRef = doc(db, 'clubSettings', 'theme');
  return onSnapshot(settingsDocRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as ClubThemeConfig);
    }
  }, (err) => {
    console.error('Error fetching club theme:', err);
    if (onError) onError(err);
  });
}

export async function saveClubThemeToFirestore(theme: ClubThemeConfig): Promise<void> {
  const settingsDocRef = doc(db, 'clubSettings', 'theme');
  const cleanData = JSON.parse(JSON.stringify(theme));
  await setDoc(settingsDocRef, cleanData, { merge: true });
}
