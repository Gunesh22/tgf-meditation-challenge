// ===== Challenge Constants =====

export const TOTAL_DAYS = 11;
export const STORAGE_KEY = 'tgf_meditation_challenge';

export const FEELINGS = [
    { value: 'peaceful', emoji: '☮️', label: 'Peaceful' },
    { value: 'distracted', emoji: '🌀', label: 'Distracted' },
    { value: 'deep', emoji: '🌊', label: 'Deep' },
    { value: 'calm', emoji: '🍃', label: 'Calm' },
    { value: 'difficult', emoji: '🪨', label: 'Difficult but meaningful' },
];

export const WISDOMS = [
    "Your mind becomes quieter with every practice.",
    "Silence is the language of the soul.",
    "You are planting seeds of awareness.",
    "Each breath is a fresh beginning.",
    "The lotus blooms in muddy water. So can you.",
    "Stillness is where creativity and solutions are found.",
    "You're not doing nothing — you're doing the most important thing.",
    "The quieter you become, the more you can hear.",
    "Peace is always just one breath away.",
    "You showed up for yourself today. That matters.",
    "Eleven days of silence will echo for a lifetime.",
];

export const SESSION_TIMES = [
    { time: '7:00 AM', label: 'IST', hourStart: 5, hourEnd: 12 },
    { time: '2:30 PM', label: 'IST', hourStart: 12, hourEnd: 18 },
    { time: '8:00 PM', label: 'IST', hourStart: 18, hourEnd: 21 },
    { time: '10:00 PM', label: 'IST', hourStart: 21, hourEnd: 24 },
    { time: '2:30 AM', label: 'IST', hourStart: 0, hourEnd: 5 },
];

export const INITIAL_STATE = {
    registered: false,
    name: '',
    email: '',
    phone: '',
    startDate: null,
    completedDays: {},
    reflections: {},
};
