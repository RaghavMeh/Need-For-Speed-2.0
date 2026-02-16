'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import PoliceChatter from '../components/PoliceChatter';
import ActiveAero from '../components/ActiveAero';
import { NPCCarData } from '../components/MainScene';

const MainScene = dynamic(() => import('../components/MainScene'), { ssr: false });

export default function Home() {
    const [speed, setSpeed] = useState(0);
    const [isAccelerating, setIsAccelerating] = useState(false);
    const [isBraking, setIsBraking] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isCrashed, setIsCrashed] = useState(false);
    const [spoilerAngle, setSpoilerAngle] = useState(0);
    const [heat, setHeat] = useState(0);

    // Race Control
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isRaceActive, setIsRaceActive] = useState(false);
    const [playerLane, setPlayerLane] = useState(0);

    // Initial NPC rivals - placed closer for a "Collective Start"
    const [npcs, setNpcs] = useState<NPCCarData[]>([
        { id: 'rival-1', type: 'rival', color: '#00ffcc', speed: 280, lane: -8, initialZ: -15 },
        { id: 'rival-2', type: 'rival', color: '#ff00ff', speed: 310, lane: 8, initialZ: -10 },
        { id: 'rival-3', type: 'rival', color: '#ffff00', speed: 295, lane: -14, initialZ: -20 },
    ]);

    const [raceTime, setRaceTime] = useState(0);

    // Timing Logic for Environment Changes
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isRaceActive && !isCrashed) {
            timer = setInterval(() => {
                setRaceTime(prev => prev + 1);
            }, 1000);
        } else if (!isRaceActive) {
            setRaceTime(0);
        }
        return () => clearInterval(timer);
    }, [isRaceActive, isCrashed]);

    // Steering Logic
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isCrashed || !isRaceActive) return;
            if (e.key === 'ArrowLeft') setPlayerLane(prev => Math.max(-16, prev - 2));
            if (e.key === 'ArrowRight') setPlayerLane(prev => Math.min(16, prev + 2));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCrashed, isRaceActive]);

    const startGrid = () => {
        setCountdown(3);
        setIsRunning(true);
    };

    useEffect(() => {
        if (countdown === null) return;
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => {
                setCountdown(null);
                setIsRaceActive(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Handle Heat & Police Spawning
    useEffect(() => {
        if (speed > 250 && isRunning && !isCrashed && isRaceActive) {
            setHeat(prev => Math.min(100, prev + 0.1));
        }

        if (heat > 30 && npcs.filter(n => n.type === 'police').length === 0) {
            setNpcs(prev => [...prev, { id: 'police-1', type: 'police', color: '#111', speed: 330, lane: 0, initialZ: 40 }]);
        }
    }, [speed, isRunning, isCrashed, heat, npcs, isRaceActive]);

    // Physics loop
    useEffect(() => {
        let animationFrame: number;
        const updatePhysics = () => {
            if (isCrashed) {
                setSpeed(prev => Math.max(0, prev - 8));
                animationFrame = requestAnimationFrame(updatePhysics);
                return;
            }

            // If pre-race or engine off, slow down
            if (!isRaceActive) {
                setSpeed(prev => Math.max(0, prev - 1));
            } else {
                setSpeed(prev => {
                    let nextSpeed = prev;
                    if (isAccelerating) nextSpeed += 1.8;
                    else if (isBraking) nextSpeed -= 6;
                    else nextSpeed -= 0.4;

                    const capped = Math.max(0, Math.min(nextSpeed, 355));
                    if (capped > 250) setSpoilerAngle(45);
                    else if (capped > 150) setSpoilerAngle(20);
                    else setSpoilerAngle(0);

                    return capped;
                });
            }

            // Pillar/Building Collision Check
            if (Math.abs(playerLane) > 15 && speed > 50) {
                setIsCrashed(true);
            }

            animationFrame = requestAnimationFrame(updatePhysics);
        };

        animationFrame = requestAnimationFrame(updatePhysics);
        return () => cancelAnimationFrame(animationFrame);
    }, [isAccelerating, isBraking, isCrashed, speed, isRaceActive, playerLane]);

    const restart = () => {
        setIsCrashed(false);
        setIsRaceActive(false);
        setIsRunning(false);
        setSpeed(0);
        setPlayerLane(0);
        setHeat(0);
        setNpcs(npcs.filter(n => n.type !== 'police'));
        setRaceTime(0);
    };

    const handleCollision = useCallback(() => {
        if (!isCrashed && speed > 20) {
            setIsCrashed(true);
        }
    }, [isCrashed, speed]);

    return (
        <main className="dashboard">
            <aside className="sidebar">
                <h1 className="nfs-title">NFS: MW <br /> <span style={{ fontSize: '1rem', color: '#ff9d00' }}>COLLECTIVE START</span></h1>

                <ActiveAero speed={speed} spoilerAngle={spoilerAngle} />

                <div className="stat-card">
                    <h4>RACE STATUS</h4>
                    <p className="glow-text" style={{ fontSize: '1rem', color: isRaceActive ? '#00ffcc' : '#ff9d00' }}>
                        {isRaceActive ? 'RACING' : countdown !== null ? 'PREPARING...' : 'ON GRID'}
                    </p>
                </div>

                <div className="stat-card">
                    <h4>RACE TIME</h4>
                    <p className="glow-text" style={{ fontSize: '1.5rem', color: raceTime > 60 ? '#ff9d00' : '#fff' }}>
                        {Math.floor(raceTime / 60)}:{(raceTime % 60).toString().padStart(2, '0')}
                    </p>
                </div>

                <div className="stat-card">
                    <h4>HEAT LEVEL</h4>
                    <div style={{ background: '#222', height: '10px', borderRadius: '5px', marginTop: '10px' }}>
                        <div style={{
                            width: `${heat}%`,
                            height: '100%',
                            background: heat > 70 ? 'red' : 'orange',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>

                <PoliceChatter intensity={(speed / 355) + (heat / 100)} />

                <div className="controls-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                    {isCrashed ? (
                        <button className="nfs-button" style={{ gridColumn: 'span 2', background: 'white' }} onClick={restart}>RE-ENTER</button>
                    ) : !isRaceActive && countdown === null ? (
                        <button className="nfs-button" style={{ gridColumn: 'span 2' }} onClick={startGrid}>START GRID</button>
                    ) : (
                        <button className="nfs-button" style={{ gridColumn: 'span 2', background: '#ff4444' }} onClick={restart}>RESTART</button>
                    )}

                    <button
                        className="nfs-button"
                        onPointerDown={() => setIsAccelerating(true)}
                        onPointerUp={() => setIsAccelerating(false)}
                        onPointerLeave={() => setIsAccelerating(false)}
                        style={{ background: isAccelerating ? '#ff9d00' : '#444' }}
                    >ACCEL</button>

                    <button
                        className="nfs-button"
                        onPointerDown={() => setIsBraking(true)}
                        onPointerUp={() => setIsBraking(false)}
                        onPointerLeave={() => setIsBraking(false)}
                        style={{ background: '#ff0000' }}
                    >BRAKE</button>

                    <button className="nfs-button" onPointerDown={() => setPlayerLane(p => Math.max(-16, p - 2))}>LEFT</button>
                    <button className="nfs-button" onPointerDown={() => setPlayerLane(p => Math.min(16, p + 2))}>RIGHT</button>
                </div>
            </aside>

            <div className="viewport">
                {countdown !== null && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)',
                        pointerEvents: 'none'
                    }}>
                        <h1 className="nfs-title" style={{ fontSize: '10rem', color: countdown === 0 ? '#00ffcc' : '#ff9d00' }}>
                            {countdown === 0 ? 'GO!' : countdown}
                        </h1>
                    </div>
                )}

                {isCrashed && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255,0,0,0.3)',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <h1 className="nfs-title" style={{ fontSize: '5rem' }}>TOTALED</h1>
                    </div>
                )}

                <MainScene speed={speed} npcs={npcs} playerLane={playerLane} isRaceActive={isRaceActive} raceTime={raceTime} onCollide={handleCollision} />

                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    background: 'rgba(0,0,0,0.8)',
                    padding: '20px',
                    borderRadius: '50%',
                    border: '4px solid var(--primary)',
                    width: '120px',
                    height: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    boxShadow: isRaceActive ? '0 0 20px #00ffcc' : 'none'
                }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Math.round(speed)}</span>
                    <span style={{ fontSize: '0.6rem' }}>KM/H</span>
                </div>
            </div>
        </main>
    );
}
