// ===== ChallengeContext =====
// Provides challenge state and actions to the entire component tree.

import { createContext, useContext, useState, useCallback } from 'react';
import { useChallenge } from '../hooks/useChallenge';
import { useStreak } from '../hooks/useStreak';

const ChallengeContext = createContext(null);

export function ChallengeProvider({ children }) {
    const challenge = useChallenge();
    const streak = useStreak(
        challenge.state.completedDays,
        challenge.state.startDate
    );

    const [language, setLanguage] = useState('en');

    const toggleLanguage = useCallback(() => {
        setLanguage(prev => prev === 'en' ? 'hi' : 'en');
    }, []);

    const value = {
        ...challenge,
        streak,
        language,
        toggleLanguage,
    };

    return (
        <ChallengeContext.Provider value={value}>
            {children}
        </ChallengeContext.Provider>
    );
}

/**
 * Hook to consume challenge context.
 * Must be used within <ChallengeProvider>.
 */
export function useChallengeContext() {
    const ctx = useContext(ChallengeContext);
    if (!ctx) {
        throw new Error('useChallengeContext must be used within ChallengeProvider');
    }
    return ctx;
}
