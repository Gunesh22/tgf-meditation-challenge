// ===== useStreak Hook =====
// Calculates the current meditation streak based on the 11-day challenge sequence.

import { useMemo } from 'react';
import { getDateForDay } from '../utils/dateHelpers';

export function calculateStreak(completedDays, startDate, totalDays) {
    if (!startDate) return { streak: 0, streakBroken: false };

    // Build a boolean array: which days (1–11) are completed?
    const dayStatus = [];
    for (let d = 1; d <= totalDays; d++) {
        const dateForDay = getDateForDay(startDate, d);
        dayStatus.push(!!completedDays[dateForDay]);
    }

    // Find the last completed day index
    let lastCompletedIdx = -1;
    for (let i = dayStatus.length - 1; i >= 0; i--) {
        if (dayStatus[i]) {
            lastCompletedIdx = i;
            break;
        }
    }

    // No days completed
    if (lastCompletedIdx === -1) return { streak: 0, streakBroken: false };

    // Count streak backward from the last completed day
    let streak = 0;
    for (let i = lastCompletedIdx; i >= 0; i--) {
        if (dayStatus[i]) {
            streak++;
        } else {
            break;
        }
    }

    // Detect if streak was broken — there's a gap before the current streak
    let streakBroken = false;
    const firstDayOfStreak = lastCompletedIdx - streak + 1;
    if (firstDayOfStreak > 0) {
        // There are days before the current streak — check if any were completed
        // (meaning there was an earlier streak that got broken)
        for (let i = 0; i < firstDayOfStreak; i++) {
            if (dayStatus[i]) {
                streakBroken = true;
                break;
            }
        }
    }

    return { streak, streakBroken };
}

/**
 * Computes streak info from completed days within the challenge.
 * Counts the longest active streak of consecutive completed days,
 * walking backward from the last completed day.
 *
 * @param {Object} completedDays - { "YYYY-MM-DD": true, ... }
 * @param {string|null} startDate - ISO date string of Day 1
 * @returns {{ streak: number, streakBroken: boolean }}
 */
export function useStreak(completedDays, startDate, totalDays = 11) {
    return useMemo(() => calculateStreak(completedDays, startDate, totalDays), [completedDays, startDate, totalDays]);
}
