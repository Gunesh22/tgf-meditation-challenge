// ===== Date Helpers =====
// Pure functions for all date calculations related to the challenge.

/**
 * Safely parses a date string (YYYY-MM-DD) into a Date object.
 * Returns null if the input is missing or results in an Invalid Date.
 */
function safeParseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const d = new Date(dateStr + 'T00:00:00');
    // isNaN on a Date returns true when the date is invalid
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns today's date as ISO string (YYYY-MM-DD) in local timezone.
 */
export function getTodayISO() {
    return new Date().toLocaleDateString('en-CA');
}

/**
 * Given a start date and a day number (1-indexed),
 * returns the ISO date string for that day.
 * Returns null if startDate is invalid.
 */
export function getDateForDay(startDate, dayNum) {
    const start = safeParseDate(startDate);
    if (!start) return null;
    const target = new Date(start);
    target.setDate(target.getDate() + (dayNum - 1));
    return target.toLocaleDateString('en-CA');
}

/**
 * Given a start date, returns the current day number (1-indexed).
 * Day 1 = the start date itself.
 * Returns 1 if startDate is invalid.
 */
export function getCurrentDay(startDate) {
    const start = safeParseDate(startDate);
    if (!start) return 1;
    const today = safeParseDate(getTodayISO());
    if (!today) return 1;
    const diffMs = today - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays + 1;
}

/**
 * Given a start date and a target date ISO, returns the day index (1-indexed).
 * Returns '?' if either date is invalid.
 */
export function getDayIndexForDate(startDate, dateISO) {
    const start = safeParseDate(startDate);
    const target = safeParseDate(dateISO);
    if (!start || !target) return '?';
    const diff = Math.floor((target - start) / (1000 * 60 * 60 * 24));
    return diff + 1;
}

/**
 * Formats a Date object as a human-readable string.
 * Returns empty string if the date is invalid.
 */
export function formatDate(date) {
    if (!date || isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Returns a human-readable label for a specific day in the challenge.
 * For the 11-day intro cohort, maps Day 1 to May 2, Day 2 to May 3, etc.
 * Otherwise falls back to "Day X".
 */
export function getDayLabel(dayNum, challengeId = '11_day_intro') {
    if (challengeId === '11_day_intro') {
        const date = new Date('2026-05-02T00:00:00');
        date.setDate(date.getDate() + (dayNum - 1));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // e.g., "May 2"
    }
    return `Day ${dayNum}`;
}
