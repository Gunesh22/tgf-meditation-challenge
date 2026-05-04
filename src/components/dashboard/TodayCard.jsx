// ===== TodayCard =====
// Main action card. Shows the selected day's status and "I Meditated" button.

import { useChallengeContext } from '../../context/ChallengeContext';
import { t } from '../../utils/translations';
import { getDayLabel } from '../../utils/dateHelpers';
import './TodayCard.css';

export function TodayCard({ selectedDay, onMeditateClick }) {
    const { state, isDayCompleted, isChallengeComplete, isChallengeFailed, language, adminSettings } = useChallengeContext();

    const dayCompleted = isDayCompleted(selectedDay);

    let heading, subtext, btnText, btnIcon, btnClass;

    // Derived wisdom from Admin settings
    const wisdom = language === 'hi'
        ? (adminSettings?.dailyWisdomHindi || adminSettings?.dailyWisdom)
        : adminSettings?.dailyWisdom;

    const dayLabel = language === 'en' ? getDayLabel(selectedDay, state?.activeChallengeId) : `${t(language, 'day')} ${selectedDay}`;

    if (isChallengeComplete) {
        heading = t(language, 'challengeCompleteHeading');
        subtext = t(language, 'challengeCompleteSub');
        btnText = t(language, 'challengeCompleteBtn');
        btnIcon = "🏆";
        btnClass = "btn-meditate completed";
    } else if (isChallengeFailed) {
        heading = t(language, 'challengeFailedHeading');
        subtext = t(language, 'challengeFailedSub');
        btnText = t(language, 'challengeFailedBtn');
        btnIcon = "🍂";
        btnClass = "btn-meditate completed";
    } else if (dayCompleted) {
        heading = t(language, 'dayCompleteHeading', { day: dayLabel });
        subtext = wisdom || t(language, 'dayCompleteSub');
        btnText = t(language, 'alreadyCompletedBtn');
        btnIcon = "✓";
        btnClass = "btn-meditate completed";
    } else {
        heading = t(language, 'dayReadyHeading', { day: dayLabel });
        subtext = wisdom || t(language, 'readySub');
        btnText = t(language, 'iMeditatedBtn');
        btnIcon = "✦";
        btnClass = "btn-meditate";
    }

    return (
        <section className="main-action-section">
            <div className="today-card">
                <div className="today-card__inner">
                    <div className="today-card__status">
                        <div className={`breath-circle ${dayCompleted || isChallengeComplete || isChallengeFailed ? 'breath-circle--still' : ''}`}>
                            <div className="breath-circle__inner">
                                <span className="breath-circle__icon">🧘</span>
                            </div>
                        </div>
                        <h3>{heading}</h3>
                        <p>{subtext}</p>
                    </div>
                    <button className={btnClass} onClick={onMeditateClick}>
                        <span className="btn-meditate__icon">{btnIcon}</span>
                        <span>{btnText}</span>
                    </button>
                </div>
            </div>
        </section>
    );
}
