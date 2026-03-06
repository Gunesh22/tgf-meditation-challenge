// ===== DashboardScreen =====
// Main screen — composes all dashboard components and manages modal + day selection state.

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeContext } from '../context/ChallengeContext';

// Dashboard components
import { TodayCard } from '../components/dashboard/TodayCard';
import { ProgressGrid } from '../components/dashboard/ProgressGrid';
import { StreakBar } from '../components/dashboard/StreakBar';
import { CommunityCard } from '../components/dashboard/CommunityCard';
import { LiveSessions } from '../components/dashboard/LiveSessions';
import { ReflectionsList } from '../components/dashboard/ReflectionsList';
import { CompleteBanner } from '../components/dashboard/CompleteBanner';

// Modals
import { ReflectionModal } from '../components/modals/ReflectionModal';
import { AlreadyDoneModal } from '../components/modals/AlreadyDoneModal';
import { CertificateModal } from '../components/modals/CertificateModal';

import './DashboardScreen.css';

export function DashboardScreen() {
    const {
        state,
        currentDay,
        isDayCompleted,
        isChallengeComplete,
        resetChallenge,
    } = useChallengeContext();

    const navigate = useNavigate();
    const topRef = useRef(null);

    // Selected day — defaults to currentDay
    const [selectedDay, setSelectedDay] = useState(currentDay);

    // Ensure page starts at the top when navigating from WelcomeScreen
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Sync selected day if the actual current challenge day rolls over
    useEffect(() => {
        setSelectedDay(currentDay);
    }, [currentDay]);

    // Modal state
    const [showReflection, setShowReflection] = useState(false);
    const [showAlreadyDone, setShowAlreadyDone] = useState(false);
    const [showCertificate, setShowCertificate] = useState(false);

    // When user taps a tile in the grid
    const handleDaySelect = useCallback((dayNum) => {
        setSelectedDay(dayNum);
        // Scroll to top so the user sees the updated TodayCard
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // When user clicks "I Meditated Today" on the TodayCard
    const handleMeditateClick = useCallback(() => {
        if (isChallengeComplete) {
            setShowCertificate(true);
            return;
        }
        if (isDayCompleted(selectedDay)) {
            setShowAlreadyDone(true);
            return;
        }
        setShowReflection(true);
    }, [selectedDay, isDayCompleted, isChallengeComplete]);

    const handleReflectionComplete = useCallback(() => {
        // After completing, check if challenge is now done
        // (completedCount will update on next render via context)
    }, []);

    const handleReset = useCallback(() => {
        if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            resetChallenge();
            navigate('/', { replace: true });
        }
    }, [resetChallenge, navigate]);

    return (
        <div className="dashboard-bg">
            {/* Scroll anchor */}
            <div ref={topRef} />

            {/* Header */}
            <header className="dash-header">
                <div className="header-left">
                    <span className="greeting-hello">Happy Thoughts</span>
                    <h2 className="greeting-name">{state.name} 🌿</h2>
                </div>
                <div className="day-badge">
                    <span className="day-badge__number">{selectedDay}</span>
                    <span className="day-badge__label">of 11</span>
                </div>
            </header>

            {/* Main action — shows selected day */}
            <TodayCard
                selectedDay={selectedDay}
                onMeditateClick={handleMeditateClick}
            />

            {/* Complete banner */}
            <CompleteBanner onViewCertificate={() => setShowCertificate(true)} />

            {/* Progress grid — click to select day */}
            <ProgressGrid
                selectedDay={selectedDay}
                onDaySelect={handleDaySelect}
            />
            <StreakBar />

            {/* Community */}
            <CommunityCard />

            {/* Live sessions */}
            <LiveSessions />

            {/* Reflections */}
            <ReflectionsList />

            {/* Footer */}
            <footer className="dash-footer">
                <p>🪷 TGF Meditation Challenge</p>
                <button className="btn-reset" onClick={handleReset}>
                    Reset Progress
                </button>
            </footer>

            {/* Modals */}
            <ReflectionModal
                isOpen={showReflection}
                onClose={() => setShowReflection(false)}
                dayNum={selectedDay}
                onComplete={handleReflectionComplete}
            />
            <AlreadyDoneModal
                isOpen={showAlreadyDone}
                onClose={() => setShowAlreadyDone(false)}
            />
            <CertificateModal
                isOpen={showCertificate}
                onClose={() => setShowCertificate(false)}
            />
        </div>
    );
}
