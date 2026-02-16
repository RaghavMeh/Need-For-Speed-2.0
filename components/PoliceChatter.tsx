'use client';

import React, { useState, useEffect, useRef } from 'react';

interface PoliceChatterProps {
    intensity: number;
}

export default function PoliceChatter({ intensity }: PoliceChatterProps) {
    const [messages, setMessages] = useState<{ sender: string, text: string }[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    const chatterLines = [
        { sender: "DISPATCH", text: "All units, we have a red Ferrari speeding on the main drag. Code 3!" },
        { sender: "UNIT 16", text: "Visual on the suspect! Man, that thing is fast. I can't keep up!" },
        { sender: "DRIVER", text: "You'll never catch me in this machine. See ya!" },
        { sender: "DISPATCH", text: "Suspect is mocking us. Authorized use of spike strips on Sector 4." },
        { sender: "UNIT 04", text: "I'm coming in hot for a PIT maneuver. Hold your positions." },
        { sender: "DRIVER", text: "PIT? You can't even touch the bumper. Pedal to the metal!" },
        { sender: "DISPATCH", text: "We've lost primary unit. Requesting air support immediately!" },
        { sender: "HELICOPTER", text: "I have the suspect in sight. He's weaving through traffic like a pro." },
        { sender: "DRIVER", text: "The sky is the limit, but not for me. Boost active!" },
    ];

    const playTTS = async (text: string) => {
        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) return;

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
        } catch (err) {
            console.log("Audio play failed - likely needs interaction or API key missing.");
        }
    };

    const triggerChatter = () => {
        setIsTyping(true);
        setTimeout(() => {
            const randomLine = chatterLines[Math.floor(Math.random() * chatterLines.length)];
            setMessages(prev => [randomLine, ...prev].slice(0, 8));
            setIsTyping(false);

            // Attempt TTS
            playTTS(randomLine.text);
        }, 600);
    };

    useEffect(() => {
        const baseDelay = 10000;
        const currentDelay = Math.max(2000, baseDelay - (intensity * 8000));
        const interval = setInterval(triggerChatter, currentDelay);
        return () => clearInterval(interval);
    }, [intensity]);

    return (
        <div className="stat-card" style={{ borderLeftColor: intensity > 0.7 ? '#ff0000' : '#ff9d00' }}>
            <h4 style={{ color: intensity > 0.7 ? '#ff4444' : '#ff9d00' }}>RADIO COMMS (ELEVENLABS)</h4>
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
                        borderLeft: m.sender === 'DRIVER' ? '2px solid #00ccff' : '2px solid #ff4444',
                        paddingLeft: '8px',
                        lineHeight: '1.2'
                    }}>
                        <strong style={{ color: m.sender === 'DRIVER' ? '#00ccff' : '#ff4444', fontSize: '0.6rem' }}>
                            {m.sender}
                        </strong>
                        <div style={{ color: '#eee' }}>{m.text}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
