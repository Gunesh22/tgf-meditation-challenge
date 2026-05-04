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

    // Listen to real-time updates for available challenges
    useEffect(() => {
        const unsubscribe = firestore.listenToChallenges((challenges) => {
            if (challenges?.length > 0) {
                setAvailableChallenges(challenges);
            }
        });
        return () => unsubscribe();
    }, []);

    // Sync from Firestore on mount
    // Uses functional setState to avoid stale closure over `state`
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                // 1. Fetch Admin Constants (Quotes/Settings)
                const settings = await firestore.fetchAdminSettings();

                if (!cancelled) {
                    if (settings) setAdminSettings(settings);
                }

                // 2. Fetch User Profile & Auto-Sync
                // Read phone/name/email from latest state via functional updater pattern
                const latestState = await new Promise(resolve => {
                    setState(prev => { resolve(prev); return prev; });
                });

                const userIdentifier = latestState.userId || latestState.phone || latestState.email;

                if (userIdentifier) {
                    let remote = await firestore.getParticipant(userIdentifier);

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
                        // ONLY if the start dates match. If they don't, a server migration happened,
                        // and pushing old local dates would corrupt the migrated remote data.
                        if (latestState.challenges) {
                            await firestore.syncOfflineChallenges(
                                userIdentifier,
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
                                        
                                        // If the server has a different start date, it means a migration occurred.
                                        // In this case, we MUST take the remote data as absolute truth, otherwise
                                        // we'll revert the startDate and corrupt the timeline with old date strings.
                                        if (remoteData.startDate !== localData.startDate) {
                                            merged.challenges[chId] = remoteData;
                                        } else {
                                            // Normal deep merge for offline progress
                                            merged.challenges[chId] = {
                                                ...remoteData,
                                                ...localData,
                                                completedDays: { ...remoteData.completedDays, ...localData.completedDays },
                                                reflections: { ...remoteData.reflections, ...localData.reflections }
                                            };
                                        }
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
    }, [state.phone, state.email]);

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
                // Store the composite Firestore doc ID so all future calls target the right document
                const merged = {
                    ...state,
                    registered: true,
                    userId: remoteUser.id,          // composite key (email__phone)
                    name: remoteUser.name || name,
                    email: remoteUser.email || email,
                    phone: remoteUser.phone || phone,
                    challenges: state.challenges || {}
                };
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
            const userIdentifier = state.userId || state.phone || state.email;
            if (userIdentifier) {
                firestore.joinChallenge(userIdentifier, challengeId, actualStartDate).catch(() => {
                    enqueueSync('joinChallenge', [userIdentifier, challengeId, actualStartDate]);
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

    const effectiveStartDate = useMemo(() => {
        if (!activeData) return null;
        if (state.activeChallengeId === '11_day_intro') return '2026-05-02';
        return activeData.startDate;
    }, [activeData, state.activeChallengeId]);

    const totalDays = activeChallengeDef ? (Number(activeChallengeDef.durationDays) || Number(activeChallengeDef.totalDays) || 11) : 11;

    // Raw current day (can exceed totalDays if the user is past the end)
    const rawCurrentDay = useMemo(() => effectiveStartDate ? getCurrentDay(effectiveStartDate) : 1, [effectiveStartDate]);
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

        const dateForDay = getDateForDay(effectiveStartDate, dayNum);
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

        const userIdentifier = state.userId || state.phone || state.email;
        if (userIdentifier) {
            firestore.completeDay(userIdentifier, challengeId, dateForDay, feeling, thought).catch(() => {
                enqueueSync('completeDay', [userIdentifier, challengeId, dateForDay, feeling, thought]);
            });
        }
    }, [state, activeData, effectiveStartDate, persist, isDayAllowed]);

    // --- Reset ---
    const resetChallenge = useCallback(() => {
        clearState();
        clearPendingSyncs(); // Prevent stale queued writes from replaying for a different user
        setState({ ...INITIAL_STATE });
    }, []);

    // --- Check day ---
    const isDayCompleted = useCallback((dayNum) => {
        if (!activeData || !effectiveStartDate) return false;
        const dateForDay = getDateForDay(effectiveStartDate, dayNum);
        return dateForDay ? !!(activeData.completedDays && activeData.completedDays[dateForDay]) : false;
    }, [activeData, effectiveStartDate]);

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
