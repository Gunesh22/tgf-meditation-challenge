// ===== Firestore Service =====
// Simple Firestore operations. No queues, no counters.
//
// Data Model:
//   participants/{sanitizedPhone}
//     - name, email, phone, startDate, createdAt
//     - completedDays: { "YYYY-MM-DD": true, ... }
//     - reflections:   { "YYYY-MM-DD": { feeling, thought }, ... }

import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const PARTICIPANTS = 'participants';

// ============ HELPERS ============

function sanitizePhone(phone) {
    return phone.replace(/\D/g, '');
}

/**
 * Retry a Firestore operation once on failure.
 */
async function withRetry(fn) {
    try {
        return await fn();
    } catch (err) {
        console.warn('[Firestore] First attempt failed, retrying...', err.message);
        try {
            return await fn();
        } catch (retryErr) {
            console.warn('[Firestore] Retry also failed:', retryErr.message);
            // Move on — localStorage has the data
        }
    }
}

// ============ PARTICIPANT OPERATIONS ============

/**
 * Register a new participant.
 */
export async function registerParticipant({ name, email, phone, startDate }) {
    const docId = sanitizePhone(phone);

    await withRetry(async () => {
        const docRef = doc(db, PARTICIPANTS, docId);
        await setDoc(docRef, {
            name,
            email,
            phone,
            startDate,
            completedDays: {},
            reflections: {},
            createdAt: serverTimestamp(),
        }, { merge: true }); // merge: true so we don't overwrite if exists
    });
}

/**
 * Load participant data by phone number.
 */
export async function getParticipant(phone) {
    const docId = sanitizePhone(phone);
    const docRef = doc(db, PARTICIPANTS, docId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        return { id: docId, ...snap.data() };
    }
    return null;
}

/**
 * Mark a day as completed with reflection data.
 */
export async function completeDay(phone, dateISO, feeling, thought) {
    const docId = sanitizePhone(phone);

    await withRetry(async () => {
        const docRef = doc(db, PARTICIPANTS, docId);
        await setDoc(docRef, {
            completedDays: { [dateISO]: true },
            reflections: { [dateISO]: { feeling, thought } },
        }, { merge: true });
    });
}

// ============ COMMUNITY COUNT ============

/**
 * Count how many participants meditated on a given date.
 * Reads all participant docs and checks their completedDays.
 */
export async function countMeditatedToday(dateISO) {
    try {
        const snap = await getDocs(collection(db, PARTICIPANTS));
        let count = 0;
        snap.forEach((doc) => {
            const data = doc.data();
            if (data.completedDays && data.completedDays[dateISO]) {
                count++;
            }
        });
        return count;
    } catch {
        return 0;
    }
}

/**
 * Get total number of participants.
 */
export async function getTotalParticipants() {
    try {
        const snap = await getDocs(collection(db, PARTICIPANTS));
        return snap.size;
    } catch {
        return 0;
    }
}
