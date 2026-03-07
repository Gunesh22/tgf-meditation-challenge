// ===== ReflectionsList =====
// Shows past meditation reflections.

import { useMemo } from 'react';
import { useChallengeContext } from '../../context/ChallengeContext';
import { getDayIndexForDate } from '../../utils/dateHelpers';
import { FEELINGS } from '../../constants';
import { t } from '../../utils/translations';
import './ReflectionsList.css';

export function ReflectionsList() {
    const { state, language } = useChallengeContext();

    const entries = useMemo(() => {
        return Object.entries(state.reflections)
            .sort(([a], [b]) => b.localeCompare(a));
    }, [state.reflections]);

    if (entries.length === 0) return null;

    const feelingLabel = (value) => {
        const transKey = `feeling_${value}`;
        const translated = t(language, transKey);
        const f = FEELINGS.find((f) => f.value === value);
        return f ? `${f.emoji} ${translated}` : translated;
    };

    return (
        <section className="reflections-section">
            <div className="section-header">
                <h3>{t(language, 'yourReflections')}</h3>
            </div>
            <div className="reflections-list">
                {entries.map(([date, data]) => {
                    const dayIdx = getDayIndexForDate(state.startDate, date);
                    return (
                        <div key={date} className="reflection-item">
                            <div className="reflection-item__header">
                                <span className="reflection-item__day">{t(language, 'day')} {dayIdx}</span>
                                <span className="reflection-item__feeling">
                                    {feelingLabel(data.feeling)}
                                </span>
                            </div>
                            {data.thought && (
                                <p className="reflection-item__thought">"{data.thought}"</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
