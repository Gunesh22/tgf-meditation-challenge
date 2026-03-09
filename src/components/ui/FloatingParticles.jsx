// ===== FloatingParticles =====
// Decorative floating particles for the welcome screen background.

import { useMemo } from 'react';
import './FloatingParticles.css';

export function FloatingParticles({ count = 20 }) {
    const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDuration: `${6 + Math.random() * 10}s`,
        animationDelay: `${Math.random() * 8}s`,
        size: 2 + Math.random() * 3,
    })), [count]);

    return (
        <div className="floating-particles">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="particle"
                    style={{
                        left: p.left,
                        animationDuration: p.animationDuration,
                        animationDelay: p.animationDelay,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                    }}
                />
            ))}
        </div>
    );
}
