import { useState, useCallback, useMemo, useEffect } from 'react';
import { AVAILABLE_CHALLENGES, INITIAL_STATE } from '../constants';
import { loadState, saveState, clearState, loadPendingSyncs, enqueueSync, dequeueSyncs, clearPendingSyncs } from '../utils/storage';
import { getTodayISO, getCurrentDay, getDateForDay } from '../utils/dateHelpers';
import * as firestore from '../services/firestore';

export function useChallenge() {
    const [state, setState] = useState(() => loadState());
    const [availableChallenges, setAvailableChallenges] = useState(AVAILABLE_CHALLENGES);
    const [adminSettings, setAdminSettings] = useState(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // Sync from Firestore on mount
    // Uses functional setState to avoid stale closure over `state`
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                // 1. Fetch Admin Constants (Challenges + Quotes)
                const [challenges, settings] = await Promise.all([
                    firestore.fetchChallenges(),
                    firestore.fetchAdminSettings()
                ]);

                if (!cancelled) {
                    if (challenges?.length > 0) setAvailableChallenges(challenges);
                    if (settings) setAdminSettings(settings);
                }

                // 2. Fetch User Profile & Auto-Sync
                // Read phone/name/email from latest state via functional updater pattern
                const latestState = await new Promise(resolve => {
                    setState(prev => { resolve(prev); return prev; });
                });

                if (latestState.phone) {
                    let remote = await firestore.getParticipant(latestState.phone);

                    // Recover missing remote profile (if they registered while blocked/offline)
                    if (!remote && latestState.name) {
                        remote = await firestore.registerParticipant({
                            name: latestState.name,
                            email: latestState.email,
                            phone: latestState.phone
                        });
                    }

                    if (remote && !cancelled) {
                        // Push any local challenges/progress that didn't make it to Firebase
                        if (latestState.challenges) {
                            await firestore.syncOfflineChallenges(
                                latestState.phone,
                                latestState.challenges,
                                remote.challenges || {}
                            ).catch(console.warn);
                        }

                        // Drain any pending retry queue items from previous failed writes
                        await drainPendingSyncs();

                        // Merge remote into state using functional updater to avoid stale data
                        setState(prev => {
                            const merged = { ...prev };
                            if (remote.challenges) {
                                merged.challenges = { ...prev.challenges };
                                for (const [chId, remoteData] of Object.entries(remote.challenges)) {
                                    if (merged.challenges[chId]) {
                                        const localData = merged.challenges[chId];
                                        // Deep merge to ensure local offline progress isn't overwritten by stale remote data
                                        merged.challenges[chId] = {
                                            ...remoteData,
                                            ...localData,
                                            completedDays: { ...remoteData.completedDays, ...localData.completedDays },
                                            reflections: { ...remoteData.reflections, ...localData.reflections }
                                        };
                                    } else {
                                        merged.challenges[chId] = remoteData;
                                    }
                                }
                            }
                            saveState(merged);
                            return merged;
                        });
                    }
                }
            } catch (err) {
                console.warn('[Sync] Firestore sync failed:', err.message);
            } finally {
                if (!cancelled) setIsDataLoaded(true);
            }
        })();

        return () => { cancelled = true; };
    }, [state.phone]);

    // --- Drain pending sync queue (retry failed Firestore writes) ---
    const drainPendingSyncs = useCallback(async () => {
        const pending = loadPendingSyncs();
        if (pending.length === 0) return;

        const succeeded = [];
        for (let i = 0; i < pending.length; i++) {
            const item = pending[i];
            try {
                if (item.type === 'completeDay') {
                    await firestore.completeDay(...item.args);
                } else if (item.type === 'joinChallenge') {
                    await firestore.joinChallenge(...item.args);
                }
                succeeded.push(i);
            } catch (err) {
                console.warn('[RetryQueue] Item still failing, will keep in queue:', err.message);
            }
        }
        if (succeeded.length === pending.length) {
            clearPendingSyncs();
        } else if (succeeded.length > 0) {
            dequeueSyncs(succeeded);
        }
    }, []);

    // --- Persist to localStorage ---
    const persist = useCallback((nextState) => {
        setState(nextState);
        saveState(nextState);
    }, []);

    // --- Register User ---
    const register = useCallback(async (name, email, phone) => {
        try {
            const remoteUser = await firestore.registerParticipant({ name, email, phone });
            if (remoteUser) {
                const merged = { ...state, registered: true, name: remoteUser.name || name, email: remoteUser.email || email, phone: remoteUser.phone || phone, challenges: state.challenges || {} };
                persist(merged);
                return;
            }
        } catch (err) {
            console.warn('[Firestore] Register failed, using local tracking', err);
        }

        persist({ ...state, registered: true, name, email, phone, challenges: state.challenges || {} });
    }, [state, persist]);

    // --- Join Challenge ---
    const joinSpecificChallenge = useCallback(async (challengeId) => {
        const today = getTodayISO();
        const def = availableChallenges.find(c => c.id === challengeId);

        let actualStartDate = today;
        if (def && def.startType === 'cohort' && def.startDate) {
            actualStartDate = def.startDate;
        }

        // Local immediately
        const next = { ...state, activeChallengeId: challengeId };
        if (!next.challenges) next.challenges = {};
        if (!next.challenges[challengeId]) {
            next.challenges[challengeId] = { startDate: actualStartDate, completedDays: {}, reflections: {} };

            // Sync to firestore — enqueue on failure for later retry
            if (state.phone) {
                firestore.joinChallenge(state.phone, challengeId, actualStartDate).catch(() => {
                    enqueueSync('joinChallenge', [state.phone, challengeId, actualStartDate]);
                });
            }
        }

        persist(next);
    }, [state, persist, availableChallenges]);

    // --- Select Active Challenge ---
    const selectChallenge = useCallback((challengeId) => {
        persist({ ...state, activeChallengeId: challengeId });
    }, [state, persist]);

    // --- Active Challenge Derived Data ---
    const activeChallengeDef = useMemo(() => availableChallenges.find(c => c.id === state.activeChallengeId), [state.activeChallengeId, availableChallenges]);
    const activeData = state.challenges && state.activeChallengeId ? state.challenges[state.activeChallengeId] : null;

    const totalDays = activeChallengeDef ? (Number(activeChallengeDef.durationDays) || Number(activeChallengeDef.totalDays) || 11) : 11;

    // Raw current day (can exceed totalDays if the user is past the end)
    const rawCurrentDay = useMemo(() => activeData ? getCurrentDay(activeData.startDate) : 1, [activeData]);
    // Clamped for UI display (never shows > totalDays)
    const clampedCurrentDay = Math.min(rawCurrentDay, totalDays);

    const completedCount = useMemo(() => activeData ? Object.keys(activeData.completedDays || {}).length : 0, [activeData]);
    const isChallengeComplete = completedCount >= totalDays;

    // Grace period: allow up to 2 days after the challenge ends so users
    // who missed the last day(s) can still catch up before being marked "failed"
    const GRACE_PERIOD_DAYS = 2;
    const isChallengeFailed = rawCurrentDay > (totalDays + GRACE_PERIOD_DAYS) && !isChallengeComplete;

    // --- Check if a day is allowed to be completed ---
    // Only current day and up to 2 past days can be marked. Future days are blocked.
    // During grace period, days up to totalDays remain completable.
    const MAX_PAST_DAYS_ALLOWED = 2;

    const isDayAllowed = useCallback((dayNum) => {
        if (!activeData) return false;
        if (isChallengeComplete || isChallengeFailed) return false;
        // The effective "head" day — within grace period, cap at totalDays
        const effectiveCurrent = Math.min(rawCurrentDay, totalDays);
        // Must be within range: (effectiveCurrent - MAX_PAST_DAYS_ALLOWED) to effectiveCurrent
        if (dayNum > effectiveCurrent) return false; // future day blocked
        if (dayNum < effectiveCurrent - MAX_PAST_DAYS_ALLOWED) return false; // too far in the past
        if (dayNum < 1) return false;
        return true;
    }, [activeData, totalDays, rawCurrentDay, isChallengeComplete, isChallengeFailed]);

    // --- Complete a day ---
    const completeDay = useCallback(async (dayNum, feeling, thought) => {
        if (!activeData || !state.activeChallengeId) return;

        // Enforce: only current day ± 2 past days allowed
        if (!isDayAllowed(dayNum)) return;

        const dateForDay = getDateForDay(activeData.startDate, dayNum);
        if (!dateForDay) return;

        const challengeId = state.activeChallengeId;
        const currentChallenge = state.challenges[challengeId];

        const next = {
            ...state,
            challenges: {
                ...state.challenges,
                [challengeId]: {
                    ...currentChallenge,
                    completedDays: {
                        ...(currentChallenge.completedDays || {}),
                        [dateForDay]: true,
                    },
                    reflections: {
                        ...(currentChallenge.reflections || {}),
                        [dateForDay]: { feeling, thought }
                    }
                }
            }
        };

        persist(next);

        if (state.phone) {
            firestore.completeDay(state.phone, challengeId, dateForDay, feeling, thought).catch(() => {
                enqueueSync('completeDay', [state.phone, challengeId, dateForDay, feeling, thought]);
            });
        }
    }, [state, activeData, persist, isDayAllowed]);

    // --- Reset ---
    const resetChallenge = useCallback(() => {
        clearState();
        clearPendingSyncs(); // Prevent stale queued writes from replaying for a different user
        setState({ ...INITIAL_STATE });
    }, []);

    // --- Check day ---
    const isDayCompleted = useCallback((dayNum) => {
        if (!activeData) return false;
        const dateForDay = getDateForDay(activeData.startDate, dayNum);
        return dateForDay ? !!(activeData.completedDays && activeData.completedDays[dateForDay]) : false;
    }, [activeData]);

    return {
        state,
        activeData,
        activeChallengeDef,
        availableChallenges,
        adminSettings,
        totalDays,
        currentDay: clampedCurrentDay,
        completedCount,
        isChallengeComplete,
        isChallengeFailed,
        isDataLoaded,
        register,
        joinSpecificChallenge,
        selectChallenge,
        completeDay,
        resetChallenge,
        isDayCompleted,
        isDayAllowed,
    };
}
