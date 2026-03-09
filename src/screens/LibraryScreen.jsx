import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeContext } from '../context/ChallengeContext';
import { Button } from '../components/ui/Button';
import './LibraryScreen.css';
import { t } from '../utils/translations';
import { getTodayISO } from '../utils/dateHelpers';
import { calculateStreak } from '../hooks/useStreak';

export function LibraryScreen() {
    const displayDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); // "8 March 2026"
        } catch (e) {
            return dateStr;
        }
    };

    const {
        state,
        joinSpecificChallenge,
        selectChallenge,
        language,
        toggleLanguage,
        resetChallenge,
        availableChallenges,
        isDataLoaded
    } = useChallengeContext();
    const navigate = useNavigate();

    const handleChallengeClick = useCallback((challengeId) => {
        const isJoined = !!state.challenges?.[challengeId];

        if (isJoined) {
            selectChallenge(challengeId);
            navigate('/dashboard');
        } else {
            joinSpecificChallenge(challengeId);
            navigate('/dashboard');
        }
    }, [state.challenges, selectChallenge, joinSpecificChallenge, navigate]);

    const handleLogout = useCallback(() => {
        if (window.confirm('Are you sure you want to logout?')) {
            resetChallenge();
            navigate('/', { replace: true });
        }
    }, [resetChallenge, navigate]);

    // Grouping & Sorting: Running challenges first, then Upcoming
    const groupedChallenges = useMemo(() => {
        const today = getTodayISO();

        const running = [];
        const upcoming = [];
        const completed = [];

        availableChallenges.forEach(challenge => {
            const userChallenge = state.challenges?.[challenge.id];
            const totalDays = Number(challenge.durationDays) || Number(challenge.totalDays) || 11;
            const completedDaysCount = userChallenge ? Object.keys(userChallenge.completedDays || {}).length : 0;
            const isCompleted = userChallenge && completedDaysCount >= totalDays;

            // Treat cohort challenges with a future startDate as upcoming
            const isUpcoming = challenge.startType === 'cohort' && challenge.startDate && challenge.startDate > today;

            if (isCompleted) {
                completed.push(challenge);
            } else if (isUpcoming) {
                upcoming.push(challenge);
            } else {
                running.push(challenge);
            }
        });

        running.sort((a, b) => {
            const aJoined = !!state.challenges?.[a.id];
            const bJoined = !!state.challenges?.[b.id];
            if (aJoined && !bJoined) return -1;
            if (!aJoined && bJoined) return 1;
            return 0; // maintain relative order if both or neither are joined
        });

        return { running, upcoming, completed };
    }, [availableChallenges, state.challenges]);

    if (!isDataLoaded) {
        return (
            <div className="library-bg">
                <div className="loading-container">
                    <div className="lotus-icon spin">🪷</div>
                    <p>Loading journey options...</p>
                </div>
            </div>
        );
    }

    const renderChallengeCard = (challenge, isUpcoming, isCompleted = false) => {
        const userChallenge = state.challenges?.[challenge.id];
        const isJoined = !!userChallenge;
        const totalDays = Number(challenge.durationDays) || Number(challenge.totalDays) || 11;
        const completedDaysCount = userChallenge ? Object.keys(userChallenge.completedDays || {}).length : 0;
        const percentage = Math.min(Math.round((completedDaysCount / totalDays) * 100), 100);

        let streak = 0;
        if (isJoined && !isUpcoming) {
            const streakData = calculateStreak(userChallenge.completedDays || {}, userChallenge.startDate, totalDays);
            streak = streakData.streak;
        }

        return (
            <div key={challenge.id} className={`challenge-card ${isJoined ? 'joined' : ''} ${isUpcoming ? 'upcoming-card' : ''} ${isCompleted ? 'completed-card' : 'running-card'}`}>
                <div className="challenge-card-icon">{challenge.icon || '🧘'}</div>
                <div className="challenge-card-info">
                    <h4 className="challenge-card-title">
                        {challenge.title || challenge.name}
                    </h4>

                    {isJoined && !isCompleted && !isUpcoming && (
                        <div className="challenge-progress-wrapper">
                            <div className="challenge-progress-track">
                                <div className="challenge-progress-fill" style={{ width: `${percentage}%` }}></div>
                            </div>
                            <span className="challenge-progress-text">{percentage}% DONE</span>
                        </div>
                    )}

                    <p>{challenge.description}</p>
                    <div className="challenge-meta">
                        <div className="meta-row">
                            {isCompleted && <span className="completed-badge">100% Completed</span>}
                            {isUpcoming && <span className="upcoming-badge">{t(language, 'upcoming')}</span>}
                            {!isJoined && !isUpcoming && !isCompleted && <span className="running-badge">Available</span>}
                            <span className="meta-days">{totalDays} {t(language, 'days')}</span>
                            {isJoined && !isCompleted && !isUpcoming && streak > 0 && (
                                <span className="meta-streak">🔥 {streak} {t(language, 'days')}</span>
                            )}
                        </div>
                        {!isUpcoming && challenge.startDate && (
                            <span className="meta-started">
                                Started: {displayDate(challenge.startDate)}
                            </span>
                        )}
                        {isUpcoming && challenge.startDate && (
                            <span className="meta-available">
                                Starts: {displayDate(challenge.startDate)}
                            </span>
                        )}
                        {isJoined && !isUpcoming && challenge.startType === 'rolling' && (
                            <span className="meta-joined">
                                Joined on: {displayDate(userChallenge.startDate)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="challenge-card-action">
                    <Button
                        variant={isCompleted ? 'secondary' : (isJoined ? 'primary' : 'secondary')}
                        onClick={() => !isUpcoming && handleChallengeClick(challenge.id)}
                        disabled={isUpcoming}
                    >
                        {isCompleted ? 'View' : (isJoined ? 'Continue' : (isUpcoming ? 'Locked' : 'Join'))}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="library-bg">
            <header className="library-header">
                <div>
                    <span className="greeting-hello">{t(language, 'greeting')}</span>
                    <h2 className="greeting-name">{state.name} 🌿</h2>
                </div>
                <button className="lang-toggle-btn" onClick={toggleLanguage}>
                    {language === 'en' ? 'अ / A' : 'A / अ'}
                </button>
            </header>

            <main className="library-main">
                <section className="library-section">
                    <h3 className="section-title">{t(language, 'libraryTitle')}</h3>
                    <p className="section-subtitle">{t(language, 'librarySub')}</p>

                    {groupedChallenges.running.length > 0 && (
                        <div className="challenge-group">
                            <h5 className="group-label">Running Now</h5>
                            <div className="challenge-list">
                                {groupedChallenges.running.map(c => renderChallengeCard(c, false, false))}
                            </div>
                        </div>
                    )}

                    {groupedChallenges.upcoming.length > 0 && (
                        <div className="challenge-group">
                            <h5 className="group-label">Upcoming</h5>
                            <div className="challenge-list">
                                {groupedChallenges.upcoming.map(c => renderChallengeCard(c, true, false))}
                            </div>
                        </div>
                    )}

                    {groupedChallenges.completed.length > 0 && (
                        <div className="challenge-group">
                            <h5 className="group-label">Completed</h5>
                            <div className="challenge-list">
                                {groupedChallenges.completed.map(c => renderChallengeCard(c, false, true))}
                            </div>
                        </div>
                    )}

                    {availableChallenges.length === 0 && (
                        <p className="section-subtitle" style={{ textAlign: 'center', marginTop: '40px' }}>No active challenges available at the moment.</p>
                    )}
                </section>
            </main>

            <footer className="library-footer">
                <button className="btn-reset" onClick={handleLogout}>
                    {t(language, 'logout')}
                </button>
            </footer>
        </div>
    );
}
