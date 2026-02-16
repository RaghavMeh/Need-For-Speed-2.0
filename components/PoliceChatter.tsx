'use client';

import React, { useState, useEffect, useRef } from 'react';

interface PoliceChatterProps {
    intensity: number;
    speed?: number;
    heat?: number;
    rank?: number;
    environment?: string;
}

export default function PoliceChatter({ intensity, speed = 0, heat = 0, rank = 0, environment = 'city' }: PoliceChatterProps) {
    const [messages, setMessages] = useState<{ sender: string, text: string }[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const lastEventRef = useRef<string>('racing');

    // Fallback lines if Gemini fails or is rate-limited
    const fallbackLines = [
        { sender: "DISPATCH", text: "All units, red Ferrari speeding on the main drag. Code 3!" },
        { sender: "UNIT 16", text: "Visual on the suspect! That thing is fast!" },
        { sender: "RIVAL", text: "You'll never catch me in this machine!" },
        { sender: "DISPATCH", text: "Authorized use of spike strips on Sector 4." },
        { sender: "UNIT 04", text: "Coming in hot for a PIT maneuver. Hold positions." },
        { sender: "RIVAL", text: "You can't even touch the bumper!" },
        { sender: "DISPATCH", text: "Lost primary unit. Requesting air support!" },
        { sender: "HELICOPTER", text: "Suspect in sight. Weaving through traffic." },
    ];

    // Determine the current event context for Gemini
    const getCurrentEvent = () => {
        if (heat > 80) return "extreme heat, cops closing in fast";
        if (speed > 300) return "hitting insane speed, pushing the limit";
        if (speed > 200) return "cruising at high speed through traffic";
        if (rank === 1) return "leading the race, dominating";
        if (rank > 2) return "falling behind, need to push harder";
        return "mid-race, holding position";
    };

    const playTTS = async (text: string) => {
        try {
            // Use Web Speech API as fallback (free, no API key needed)
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.1;
                utterance.pitch = 0.8;
                utterance.volume = 0.6;
                window.speechSynthesis.speak(utterance);
            }
        } catch (err) {
            console.log("TTS failed");
        }
    };

    const triggerChatter = async () => {
        setIsTyping(true);

        try {
            // Try Gemini-powered dynamic taunt
            const response = await fetch('/api/taunt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    speed: Math.round(speed),
                    heat: Math.round(heat),
                    rank,
                    environment,
                    event: getCurrentEvent()
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const newMsg = { sender: data.sender || 'RADIO', text: data.message || 'Static...' };
                setMessages(prev => [newMsg, ...prev].slice(0, 8));
                setIsTyping(false);
                playTTS(newMsg.text);
                return;
            }
        } catch (err) {
            // Gemini failed, use fallback
        }

        // Fallback: use static lines
        const randomLine = fallbackLines[Math.floor(Math.random() * fallbackLines.length)];
        setMessages(prev => [randomLine, ...prev].slice(0, 8));
        setIsTyping(false);
        playTTS(randomLine.text);
    };

    // Bin intensity to prevent excessive re-renders
    const binnedIntensity = Math.round(intensity * 10) / 10;

    useEffect(() => {
        const baseDelay = 12000;
        const currentDelay = Math.max(3000, baseDelay - (binnedIntensity * 8000));
        const interval = setInterval(triggerChatter, currentDelay);
        return () => clearInterval(interval);
    }, [binnedIntensity]);

    return (
        <div className="stat-card" style={{ borderLeftColor: intensity > 0.7 ? '#ff0000' : '#ff9d00' }}>
            <h4 style={{ color: intensity > 0.7 ? '#ff4444' : '#ff9d00' }}>
                📡 RADIO COMMS {intensity > 0.5 ? '(AI LIVE)' : ''}
            </h4>
            <div style={{
                height: '150px',
                overflowY: 'hidden',
                marginTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {isTyping && <div className="glow-text" style={{ fontSize: '0.6rem', opacity: 0.5 }}>SIGNAL INTERCEPTED...</div>}
                {messages.map((m, i) => (
                    <div key={i} style={{
                        fontSize: '0.75rem',
                        opacity: 1 / (i * 0.5 + 1),
                        borderLeft: m.sender === 'RIVAL' ? '2px solid #00ccff' : '2px solid #ff4444',
                        paddingLeft: '8px',
                        lineHeight: '1.2'
                    }}>
                        <strong style={{ color: m.sender === 'RIVAL' ? '#00ccff' : '#ff4444', fontSize: '0.6rem' }}>
                            {m.sender}
                        </strong>
                        <div style={{ color: '#eee' }}>{m.text}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
