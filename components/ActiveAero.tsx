'use client';

import React from 'react';

interface ActiveAeroProps {
    speed: number;
    spoilerAngle: number;
}

export default function ActiveAero({ speed, spoilerAngle }: ActiveAeroProps) {
    return (
        <div className="stat-card">
            <h4 style={{ color: '#00ffcc' }}>AERO TELEMETRY</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '10px' }}>
                <span>SPEED</span>
                <span className="glow-text">{Math.round(speed)} KM/H</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>SPOILER</span>
                <span>{spoilerAngle}° ACTIVE</span>
            </div>
            <div style={{
                width: '100%',
                height: '4px',
                background: '#222',
                marginTop: '10px',
                borderRadius: '2px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${(speed / 320) * 100}%`,
                    height: '100%',
                    background: 'var(--primary)',
                    transition: 'width 0.1s linear'
                }} />
            </div>
        </div>
    );
}
