// ===== StreakBar =====
// Displays current streak with reset message when broken.

import { useChallengeContext } from '../../context/ChallengeContext';
import { t } from '../../utils/translations';
import './StreakBar.css';

export function StreakBar() {
    const { streak, language } = useChallengeContext();

    return (
        <div className="streak-wrapper">
            <div className={`streak-bar ${streak.streakBroken ? 'streak-bar--lost' : ''}`}>
                <span className="streak-bar__icon">🔥</span>
                <span className="streak-bar__text">
                    {t(language, 'currentStreak')} <strong>{streak.streak}</strong> {t(language, 'days')}
                </span>
            </div>
            {streak.streakBroken && (
                <p className="streak-message">
                    {t(language, 'streakBroken')}
                </p>
            )}
        </div>
    );
}
