// ===== LocalStorage Abstraction =====

import { STORAGE_KEY, INITIAL_STATE } from '../constants';

/**
 * Loads challenge state from localStorage.
 * Returns INITIAL_STATE if nothing stored or parse fails.
 */
export function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Ensure all required fields exist (migration safety)
            return {
                ...INITIAL_STATE,
                ...parsed,
                completedDays: parsed.completedDays || {},
                reflections: parsed.reflections || {},
            };
        }
    } catch (e) {
        console.warn('[Storage] Failed to load state:', e);
    }
    return {
        ...INITIAL_STATE,
        challenges: {},
        completedDays: {},
        reflections: {}
    };
}

/**
 * Persists challenge state to localStorage.
 */
export function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('[Storage] Failed to save state:', e);
    }
}

/**
 * Clears all challenge data from localStorage.
 */
export function clearState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('[Storage] Failed to clear state:', e);
    }
}

// ===== Persistent Retry Queue for Failed Firestore Writes =====

const PENDING_SYNC_KEY = 'tgf_pending_syncs';

/**
 * Loads pending sync items from localStorage.
 * Each item: { type: 'completeDay'|'joinChallenge', args: [...], timestamp: number }
 */
export function loadPendingSyncs() {
    try {
        const raw = localStorage.getItem(PENDING_SYNC_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Saves the pending sync queue to localStorage.
 */
function savePendingSyncs(queue) {
    try {
        localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue));
    } catch (e) {
        console.warn('[Storage] Failed to save pending syncs:', e);
    }
}

/**
 * Adds a failed Firestore operation to the retry queue.
 * @param {string} type - 'completeDay' or 'joinChallenge'
 * @param {Array} args - arguments to replay (e.g. [phone, challengeId, dateISO, feeling, thought])
 */
export function enqueueSync(type, args) {
    const queue = loadPendingSyncs();
    // Deduplicate: don't add if an identical item already exists
    const key = JSON.stringify({ type, args });
    if (queue.some(item => JSON.stringify({ type: item.type, args: item.args }) === key)) return;
    queue.push({ type, args, timestamp: Date.now() });
    savePendingSyncs(queue);
}

/**
 * Removes successfully synced items from the queue.
 * @param {Array} indices - sorted descending indices to remove
 */
export function dequeueSyncs(indices) {
    const queue = loadPendingSyncs();
    // Remove from end so indices stay valid
    for (const i of [...indices].sort((a, b) => b - a)) {
        queue.splice(i, 1);
    }
    savePendingSyncs(queue);
}

/**
 * Clears the entire pending sync queue (e.g. after full successful sync).
 */
export function clearPendingSyncs() {
    try {
        localStorage.removeItem(PENDING_SYNC_KEY);
    } catch { }
}
