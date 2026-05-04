// ===== ProgressGrid =====
// Visual 11-day progress grid. Clicking a tile selects that day.

import { useChallengeContext } from '../../context/ChallengeContext';
import { t } from '../../utils/translations';
import { getDayLabel } from '../../utils/dateHelpers';
import './ProgressGrid.css';

export function ProgressGrid({ selectedDay, onDaySelect, isDayAllowed }) {
    const { state, completedCount, isDayCompleted, language, totalDays } = useChallengeContext();

    const days = Array.from({ length: totalDays }, (_, i) => i + 1);

    return (
        <section className="progress-section">
            <div className="section-header">
                <h3>{t(language, 'yourJourney')}</h3>
                <span className="progress-counter">{completedCount} / {totalDays}</span>
            </div>

            <div className="progress-grid">
                {days.map((d) => {
                    const completed = isDayCompleted(d);
                    const isSelected = d === selectedDay;
                    const allowed = isDayAllowed ? isDayAllowed(d) : true;
                    
                    const label = language === 'en' ? getDayLabel(d, state?.activeChallengeId) : `${t(language, 'day')} ${d}`;

                    let className = 'progress-day';
                    if (completed) className += ' progress-day--completed';
                    if (isSelected) className += ' progress-day--selected';
                    if (!completed && !allowed) className += ' progress-day--locked';

                    return (
                        <button
                            key={d}
                            className={className}
                            onClick={() => onDaySelect(d)}
                            type="button"
                            aria-label={isSelected ? t(language, 'daySelected', { day: label }) : (completed ? t(language, 'dayCompleted', { day: label }) : t(language, 'day', { day: d }))}
                        >
                            <span className="progress-day__num">{label}</span>
                            <span className="progress-day__icon">{completed ? '✔' : (allowed ? '○' : '🔒')}</span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
