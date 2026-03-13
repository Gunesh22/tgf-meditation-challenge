// ===== WelcomeScreen =====
// Registration screen — name + phone, then redirect to dashboard.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallengeContext } from '../context/ChallengeContext';
import { FloatingParticles } from '../components/ui/FloatingParticles';
import { Button } from '../components/ui/Button';
import { getTotalParticipants } from '../services/firestore';
import './WelcomeScreen.css';

export function WelcomeScreen() {
    const { register } = useChallengeContext();
    const navigate = useNavigate();

    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [communityCount, setCommunityCount] = useState(0);
    // Timer ref to cancel pending logins if component unmounts
    const timeoutRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        getTotalParticipants().then(count => {
            if (isMounted) {
                setCommunityCount(count);
            }
        }).catch(err => console.warn('Failed to get participants', err));

        return () => {
            isMounted = false;
            // Clear any pending registration if the user leaves early
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !email.trim() || !phone.trim()) return;

        // Basic Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Please enter a valid email address.');
            return;
        }

        // Basic Phone Validation (Allows +, numbers, spaces, dashes, 10-15 chars)
        const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
        if (!phoneRegex.test(phone.trim())) {
            setError('Please enter a valid phone number (e.g. 9876543210).');
            return;
        }

        setIsRegistering(true);

        // Simulate a calming delay for the preparation screen
        timeoutRef.current = setTimeout(async () => {
            await register(name.trim(), email.trim(), phone.trim());
            navigate('/library', { replace: true, state: { fromLogin: true } });
        }, 2500);
    }, [name, email, phone, register, navigate]);

    if (isRegistering) {
        return (
            <div className="welcome-bg">
                <FloatingParticles count={20} />
                <div className="welcome-content loading-content">
                    <div className="lotus-icon">🪷</div>
                    <h2 className="loading-title fade-in delay-1">Preparing your journey...</h2>
                    <p className="loading-subtitle fade-in delay-2">Taking a deep breath</p>
                </div>
            </div>
        );
    }

    return (
        <div className="welcome-bg">
            <FloatingParticles count={20} />

            <div className="welcome-content">
                {/* Logo */}
                <div className="welcome-logo fade-in">
                    <div className="lotus-icon">🪷</div>
                    <h1 className="welcome-title">
                        Meditation<br /><span>Challenge Platform</span>
                    </h1>
                    <p className="welcome-subtitle">by Tej Gyan Foundation</p>
                </div>

                {/* Quote */}
                <div className="welcome-quote fade-in delay-1">
                    <p>"The thing about meditation is: you become more and more you."</p>
                    <span>— David Lynch</span>
                </div>

                {/* Form */}
                <form className="join-form fade-in delay-2" onSubmit={handleSubmit} autoComplete="off">
                    {error && <div className="form-error">{error}</div>}
                    <div className="form-group">
                        <label htmlFor="user-name">Your Name</label>
                        <input
                            id="user-name"
                            type="text"
                            placeholder="Enter your name"
                            required
                            minLength={2}
                            maxLength={50}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="user-email">Email Address</label>
                        <input
                            id="user-email"
                            type="email"
                            placeholder="Enter your email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="user-phone">Phone Number</label>
                        <input
                            id="user-phone"
                            type="tel"
                            placeholder="Enter your phone number"
                            required
                            minLength={10}
                            maxLength={15}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="primary"
                        type="submit"
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        }
                    >
                        Begin Your Journey
                    </Button>
                </form>

                {/* Community badge */}
                <div className="community-badge fade-in delay-3">
                    <div className="pulse-dot" />
                    <span>{communityCount > 0 ? communityCount.toLocaleString() : '...'} seekers have joined</span>
                </div>
            </div>
        </div>
    );
}
