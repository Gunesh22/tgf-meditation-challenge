// ===== LiveSessions =====
// Shows daily meditation session times and YouTube link.

import { SESSION_TIMES } from '../../constants';
import './LiveSessions.css';

export function LiveSessions() {
    // Get the current hour specifically in Indian Standard Time (IST)
    const istHourStr = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        hour12: false
    });
    const hour = parseInt(istHourStr, 10) % 24;

    return (
        <section className="live-section">
            <div className="section-header">
                <h3>Today's Live Meditation</h3>
            </div>

            <div className="live-sessions">
                {SESSION_TIMES.map((session) => {
                    const isActive = hour >= session.hourStart && hour < session.hourEnd;
                    return (
                        <div
                            key={session.time}
                            className={`session-chip ${isActive ? 'session-chip--active' : ''}`}
                        >
                            <span className="session-chip__time">{session.time}</span>
                            <span className="session-chip__label">{session.label}</span>
                        </div>
                    );
                })}
            </div>

            <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-youtube"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.4-1.9.5-5.8.5-5.8s-.1-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z" />
                </svg>
                <span>Watch on YouTube</span>
            </a>
        </section>
    );
}
