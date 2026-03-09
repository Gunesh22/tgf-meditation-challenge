// ===== Firestore Service =====
// Multiple Challenges Architecture
//
// Data Model:
//   users/{sanitizedPhone}
//     - name, email, phone, createdAt, isAdmin
//
//   user_challenges/{sanitizedPhone}_{challengeId}
//     - userId, challengeId, startDate, createdAt
//     - completedDays: { "YYYY-MM-DD": true, ... }
//     - reflections:   { "YYYY-MM-DD": { feeling, thought }, ... }

import {
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    getCountFromServer,
    serverTimestamp,
    query,
    where,
    writeBatch,
    updateDoc,
    limit
} from 'firebase/firestore';

// ============ IN-MEMORY CACHE ============
const cache = {
    communityCounts: { daily: null, total: null, timestamp: 0 },
    challenges: { data: null, timestamp: 0 },
    adminSettings: { data: null, timestamp: 0 }
};
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes cache
import { db } from './firebase';

const USERS = 'users';
const USER_CHALLENGES = 'user_challenges';
const CHALLENGES = 'challenges';
const ADMIN_SETTINGS = 'admin_settings';

// ============ HELPERS ============

function sanitizePhone(phone) {
    return phone.replace(/\D/g, '');
}

async function withRetry(fn) {
    try {
        return await fn();
    } catch (err) {
        console.warn('[Firestore] First attempt failed, retrying...', err.message);
        try {
            return await fn();
        } catch (retryErr) {
            console.warn('[Firestore] Retry also failed:', retryErr.message);
        }
    }
}

// ============ USER & CHALLENGE OPERATIONS ============

/**
 * Register or get a base user profile.
 */
export async function registerParticipant({ name, email, phone }) {
    const docId = sanitizePhone(phone);

    return await withRetry(async () => {
        const docRef = doc(db, USERS, docId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            return { id: docId, ...snap.data() };
        }

        const newData = {
            name,
            email,
            phone,
            createdAt: serverTimestamp(),
        };
        await setDoc(docRef, newData);
        return { id: docId, ...newData };
    });
}

/**
 * Join a specific challenge
 */
export async function joinChallenge(phone, challengeId, startDate) {
    const userId = sanitizePhone(phone);
    const docId = `${userId}_${challengeId}`;

    return await withRetry(async () => {
        const docRef = doc(db, USER_CHALLENGES, docId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            return { id: docId, ...snap.data() };
        }

        const newData = {
            userId,
            challengeId,
            startDate,
            completedDays: {},
            reflections: {},
            createdAt: serverTimestamp(),
        };
        await setDoc(docRef, newData);
        return { id: docId, ...newData };
    });
}

/**
 * Load user profile AND all their joined challenges.
 */
export async function getParticipant(phone) {
    const userId = sanitizePhone(phone);

    // 1. Get user profile
    const userRef = doc(db, USERS, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // Fallback for easy migration later if needed, but for now just return null
        return null;
    }

    // 2. Get their challenges (capped to 50 to prevent unbounded scaling issues)
    const q = query(
        collection(db, USER_CHALLENGES),
        where('userId', '==', userId),
        limit(50)
    );
    const challengeSnaps = await getDocs(q);

    const challenges = {};
    challengeSnaps.forEach((docSnap) => {
        const data = docSnap.data();
        challenges[data.challengeId] = {
            startDate: data.startDate,
            completedDays: data.completedDays || {},
            reflections: data.reflections || {},
        };
    });

    return {
        id: userId,
        ...userSnap.data(),
        challenges // e.g. { "11_day_intro": { startDate, completedDays } }
    };
}

/**
 * Mark a day as completed with reflection data for a Specific Challenge.
 */
export async function completeDay(phone, challengeId, dateISO, feeling, thought) {
    const userId = sanitizePhone(phone);
    const docId = `${userId}_${challengeId}`;

    await withRetry(async () => {
        const docRef = doc(db, USER_CHALLENGES, docId);
        try {
            // Use dot notation to strictly update only this specific day, avoiding
            // deep-merge collisions if multiple devices complete days simultaneously.
            await updateDoc(docRef, {
                [`completedDays.${dateISO}`]: true,
                [`reflections.${dateISO}`]: { feeling, thought }
            });
        } catch (err) {
            // Fallback: If document doesn't exist yet (created offline), use setDoc
            await setDoc(docRef, {
                userId,
                challengeId,
                completedDays: { [dateISO]: true },
                reflections: { [dateISO]: { feeling, thought } },
                createdAt: serverTimestamp(),
            }, { merge: true });
        }
    });
}

/**
 * Sync all local offline challenge progress to Firestore in a single batch
 */
export async function syncOfflineChallenges(phone, localChallenges, remoteChallenges) {
    const userId = sanitizePhone(phone);

    return await withRetry(async () => {
        const batch = writeBatch(db);
        let hasChanges = false;

        for (const [chId, localData] of Object.entries(localChallenges || {})) {
            const remoteData = remoteChallenges?.[chId];
            const docId = `${userId}_${chId}`;
            const docRef = doc(db, USER_CHALLENGES, docId);

            // If completely missing remotely, create it
            if (!remoteData) {
                batch.set(docRef, {
                    userId,
                    challengeId: chId,
                    startDate: localData.startDate,
                    completedDays: localData.completedDays || {},
                    reflections: localData.reflections || {},
                    createdAt: serverTimestamp(),
                });
                hasChanges = true;
            } else {
                // It exists remotely, but we need to merge any missing completedDays
                const missingDays = {};
                const missingReflections = {};
                let needsMerge = false;

                for (const [dateISO, _] of Object.entries(localData.completedDays || {})) {
                    if (!remoteData.completedDays?.[dateISO]) {
                        missingDays[dateISO] = true;
                        if (localData.reflections?.[dateISO]) {
                            missingReflections[dateISO] = localData.reflections[dateISO];
                        }
                        needsMerge = true;
                    }
                }

                if (needsMerge) {
                    batch.set(docRef, {
                        completedDays: missingDays,
                        reflections: missingReflections
                    }, { merge: true });
                    hasChanges = true;
                }
            }
        }

        if (hasChanges) {
            await batch.commit();
        }
        return hasChanges;
    });
}


// ============ COMMUNITY COUNT ============

export async function countMeditatedToday(dateISO) {
    const now = Date.now();
    // Cache daily count heavily (especially helpful on dashboard re-renders)
    if (cache.communityCounts.daily !== null && (now - cache.communityCounts.timestamp < CACHE_TTL_MS)) {
        return cache.communityCounts.daily;
    }

    try {
        const q = query(
            collection(db, USER_CHALLENGES),
            where(`completedDays.${dateISO}`, '==', true)
        );
        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;
        cache.communityCounts.daily = count;
        cache.communityCounts.timestamp = now;
        return count;
    } catch {
        return cache.communityCounts.daily || 0;
    }
}

export async function getTotalParticipants() {
    const now = Date.now();
    if (cache.communityCounts.total !== null && (now - cache.communityCounts.timestamp < CACHE_TTL_MS)) {
        return cache.communityCounts.total;
    }

    try {
        const snapshot = await getCountFromServer(collection(db, USERS));
        const count = snapshot.data().count;
        cache.communityCounts.total = count;
        cache.communityCounts.timestamp = now;
        return count;
    } catch {
        return cache.communityCounts.total || 0;
    }
}

/**
 * Fetch all available challenges defined by the Admin Panel
 */
export async function fetchChallenges() {
    const now = Date.now();
    if (cache.challenges.data && (now - cache.challenges.timestamp < CACHE_TTL_MS)) {
        return cache.challenges.data;
    }

    return await withRetry(async () => {
        // Limit total challenges downloaded to prevent unbounded read growth
        const q = query(collection(db, CHALLENGES), limit(100));
        const querySnapshot = await getDocs(q);
        const fetched = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.isActive !== false) {
                fetched.push({ id: docSnap.id, ...data });
            }
        });
        cache.challenges.data = fetched;
        cache.challenges.timestamp = now;
        return fetched;
    });
}

/**
 * Fetch global app settings (Daily Wisdom, Hindi Translations, etc.)
 */
export async function fetchAdminSettings() {
    const now = Date.now();
    if (cache.adminSettings.data && (now - cache.adminSettings.timestamp < CACHE_TTL_MS)) {
        return cache.adminSettings.data;
    }

    return await withRetry(async () => {
        const docRef = doc(db, ADMIN_SETTINGS, 'content_management');
        const snap = await getDoc(docRef);
        const data = snap.exists() ? snap.data() : null;
        if (data) {
            cache.adminSettings.data = data;
            cache.adminSettings.timestamp = now;
        }
        return data;
    });
}
