'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import PoliceChatter from '../components/PoliceChatter';
import ActiveAero from '../components/ActiveAero';
import { NPCCarData } from '../components/MainScene';

const MainScene = dynamic(() => import('../components/MainScene'), { ssr: false });

const RACE_DISTANCE = 10000; // 10km race

export default function Home() {
    const [speed, setSpeed] = useState(0);
    const [isAccelerating, setIsAccelerating] = useState(false);
    const [isBraking, setIsBraking] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isCrashed, setIsCrashed] = useState(false);
    const [isBusted, setIsBusted] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [spoilerAngle, setSpoilerAngle] = useState(0);
    const [heat, setHeat] = useState(0);

    // Race Control
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isRaceActive, setIsRaceActive] = useState(false);
    const [playerLane, setPlayerLane] = useState(0);
    const [playerDistance, setPlayerDistance] = useState(0);

    // Refs for high-frequency updates (don't trigger re-renders)
    const speedRef = useRef(0);
    const distRef = useRef(0);

    // Leaderboard
    const [finishTimes, setFinishTimes] = useState<{ id: string, name: string, time: number }[]>([]);
    const finishedIds = useRef(new Set<string>());

    // NPCs: Rivals + Police parked on roadside
    const initialNpcs: NPCCarData[] = [
        // Rivals — collective start
        { id: 'rival-1', type: 'rival', color: '#00ffcc', speed: 280, lane: -8, initialZ: -15 },
        { id: 'rival-2', type: 'rival', color: '#ff00ff', speed: 310, lane: 8, initialZ: -10 },
        { id: 'rival-3', type: 'rival', color: '#ffff00', speed: 295, lane: -14, initialZ: -20 },
        // Police — parked on roadside shoulder at staggered distances
        { id: 'police-1', type: 'police', color: '#111', speed: 330, lane: 18, initialZ: -200 },
        { id: 'police-2', type: 'police', color: '#111', speed: 340, lane: -18, initialZ: -450 },
        { id: 'police-3', type: 'police', color: '#111', speed: 335, lane: 18, initialZ: -700 },
        { id: 'police-4', type: 'police', color: '#111', speed: 345, lane: -18, initialZ: -1000 },
    ];

    const [npcs, setNpcs] = useState<NPCCarData[]>(initialNpcs);
    const [raceTime, setRaceTime] = useState(0);

    // Race clock
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isRaceActive && !isCrashed && !isBusted && !isFinished) {
            timer = setInterval(() => {
                setRaceTime(prev => prev + 1);
            }, 1000);
        } else if (!isRaceActive) {
            setRaceTime(0);
        }
        return () => clearInterval(timer);
    }, [isRaceActive, isCrashed, isBusted, isFinished]);

    // Game state sync interval (100ms) — distance, finish checks, NPC finishes
    useEffect(() => {
        if (!isRaceActive || isCrashed || isBusted || isFinished) return;

        const interval = setInterval(() => {
            // Sync distance to React state
            setPlayerDistance(distRef.current);

            // Heat buildup at high speed
            if (speedRef.current > 250) {
                setHeat(prev => Math.min(100, prev + 0.15));
            }

            // Player finish check
            if (distRef.current >= RACE_DISTANCE && !finishedIds.current.has('player')) {
                finishedIds.current.add('player');
                setIsFinished(true);
                setFinishTimes(prev =>
                    [...prev, { id: 'player', name: '🏎️ YOU (FERRARI)', time: raceTime }]
                        .sort((a, b) => a.time - b.time)
                );
            }

            // NPC rival finish simulation
            npcs.forEach(npc => {
                if (npc.type === 'rival' && !finishedIds.current.has(npc.id)) {
                    // Estimate NPC distance based on their speed and race time
                    const npcDist = npc.speed * raceTime * 0.3;
                    if (npcDist >= RACE_DISTANCE) {
                        finishedIds.current.add(npc.id);
                        const names: Record<string, string> = {
                            'rival-1': '🟢 TURBO (LAMBO)',
                            'rival-2': '🟣 PHANTOM (PORSCHE)',
                            'rival-3': '🟡 THUNDER (MCLAREN)'
                        };
                        setFinishTimes(prev =>
                            [...prev, { id: npc.id, name: names[npc.id] || npc.id, time: raceTime }]
                                .sort((a, b) => a.time - b.time)
                        );
                    }
                }
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isRaceActive, isCrashed, isBusted, isFinished, raceTime, npcs]);

    // Steering & acceleration keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isCrashed || isBusted || isFinished) return;
            if (e.key === 'ArrowLeft') setPlayerLane(prev => Math.max(-16, prev - 2));
            if (e.key === 'ArrowRight') setPlayerLane(prev => Math.min(16, prev + 2));
            if (e.key === 'ArrowUp') setIsAccelerating(true);
            if (e.key === 'ArrowDown') setIsBraking(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') setIsAccelerating(false);
            if (e.key === 'ArrowDown') setIsBraking(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isCrashed, isBusted, isFinished, isRaceActive]);

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

    // Physics loop
    useEffect(() => {
        let animationFrame: number;
        let lastSync = 0;

        const updatePhysics = (time: number) => {
            if (isCrashed || isBusted) {
                speedRef.current = Math.max(0, speedRef.current - 8);
            } else if (isFinished) {
                speedRef.current = Math.max(0, speedRef.current - 2);
            } else if (isRaceActive) {
                let nextSpeed = speedRef.current;
                if (isAccelerating) nextSpeed += 1.8;
                else if (isBraking) nextSpeed -= 6;
                else nextSpeed -= 0.4;
                speedRef.current = Math.max(0, Math.min(nextSpeed, 355));

                // Distance tracking
                distRef.current += (speedRef.current * 0.05);

                // Spoiler angle
                if (speedRef.current > 250) setSpoilerAngle(45);
                else if (speedRef.current > 150) setSpoilerAngle(20);
                else setSpoilerAngle(0);
            } else {
                speedRef.current = Math.max(0, speedRef.current - 1);
            }

            // Sync speed to UI at ~30fps
            if (time - lastSync > 33) {
                setSpeed(speedRef.current);
                lastSync = time;
            }

            // Obstacle collision
            if (Math.abs(playerLane) > 15 && speedRef.current > 50) {
                handleCollision('rival');
            }

            animationFrame = requestAnimationFrame(updatePhysics);
        };

        animationFrame = requestAnimationFrame(updatePhysics);
        return () => cancelAnimationFrame(animationFrame);
    }, [isAccelerating, isBraking, isCrashed, isBusted, isFinished, isRaceActive, playerLane]);

    const handleCollision = useCallback((type: 'rival' | 'police') => {
        if (isCrashed || isBusted) return;
        if (type === 'police' && speed > 10) {
            setIsBusted(true);
            setHeat(100);
        } else if (type === 'rival' && speed > 20) {
            setIsCrashed(true);
        }
    }, [isCrashed, isBusted, speed]);

    const restart = useCallback(() => {
        setIsCrashed(false);
        setIsBusted(false);
        setIsFinished(false);
        setIsRaceActive(false);
        setIsRunning(false);
        setSpeed(0);
        speedRef.current = 0;
        setPlayerLane(0);
        setHeat(0);
        setSpoilerAngle(0);
        setPlayerDistance(0);
        distRef.current = 0;
        setFinishTimes([]);
        finishedIds.current.clear();
        setRaceTime(0);
        setNpcs([...initialNpcs]);
    }, []);

    const progressPercent = Math.min(100, (playerDistance / RACE_DISTANCE) * 100);

    return (
        <main className="dashboard">
            <aside className="sidebar">
                <h1 className="nfs-title">NFS: MW <br /> <span style={{ fontSize: '1rem', color: '#ff9d00' }}>COLLECTIVE START</span></h1>

                <ActiveAero speed={speed} spoilerAngle={spoilerAngle} />

                <div className="stat-card">
                    <h4>RACE STATUS</h4>
                    <p className="glow-text" style={{
                        fontSize: '1rem',
                        color: isBusted ? '#ff0000' : isFinished ? '#00ffcc' : isRaceActive ? '#00ffcc' : '#ff9d00'
                    }}>
                        {isBusted ? '🚨 BUSTED' : isCrashed ? 'TOTALED' : isFinished ? '🏁 FINISHED' : isRaceActive ? 'RACING' : countdown !== null ? 'PREPARING...' : 'ON GRID'}
                    </p>
                </div>

                <div className="stat-card">
                    <h4>RACE TIME</h4>
                    <p className="glow-text" style={{ fontSize: '1.5rem', color: raceTime > 60 ? '#ff9d00' : '#fff' }}>
                        {Math.floor(raceTime / 60)}:{(raceTime % 60).toString().padStart(2, '0')}
                    </p>
                </div>

                {/* Race Progress Bar */}
                <div className="stat-card">
                    <h4>RACE PROGRESS — {(playerDistance / 1000).toFixed(1)} / {RACE_DISTANCE / 1000} KM</h4>
                    <div style={{ background: '#222', height: '8px', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #00ffcc, #ff9d00)',
                            transition: 'width 0.3s ease',
                            borderRadius: '4px'
                        }} />
                    </div>
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

                <div className="stat-card">
                    <h4>🚔 POLICE UNITS</h4>
                    <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '5px' }}>
                        {npcs.filter(n => n.type === 'police').length} units deployed along route — roadside ambush
                    </p>
                </div>

                <PoliceChatter
                    intensity={(speed / 355) + (heat / 100)}
                    speed={speed}
                    heat={heat}
                    rank={finishTimes.findIndex(f => f.id === 'player') + 1 || 4}
                    environment="city"
                />

                <div style={{ marginTop: 'auto', padding: '10px', color: '#666', fontSize: '0.8rem', textAlign: 'center' }}>
                    KEYBOARD CONTROLS:<br />
                    ⬆️ ACCEL | ⬇️ BRAKE<br />
                    ⬅️ LEFT | ➡️ RIGHT
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
                        position: 'absolute', inset: 0, background: 'rgba(255,0,0,0.3)', zIndex: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <h1 className="nfs-title" style={{ fontSize: '5rem' }}>TOTALED</h1>
                    </div>
                )}

                {isBusted && (
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,100,0.4)', zIndex: 10,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <h1 className="nfs-title" style={{ fontSize: '5rem', color: '#ff0000' }}>🚨 BUSTED</h1>
                        <p style={{ fontSize: '1.2rem', color: '#ccc', marginTop: '10px' }}>Intercepted by the police!</p>
                    </div>
                )}

                {/* === LEADERBOARD OVERLAY (shown when race finishes) === */}
                {isFinished && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 20,
                        background: 'radial-gradient(circle, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.95) 100%)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'auto'
                    }}>
                        <h1 className="nfs-title" style={{ fontSize: '3rem', marginBottom: '10px' }}>🏁 RACE COMPLETE</h1>
                        <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '30px' }}>
                            Final standings — {Math.floor(raceTime / 60)}:{(raceTime % 60).toString().padStart(2, '0')}
                        </p>

                        <div style={{
                            width: '400px',
                            background: 'rgba(20,20,30,0.9)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            overflow: 'hidden'
                        }}>
                            {/* Header */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '40px 1fr 100px',
                                padding: '12px 16px', background: 'rgba(255,157,0,0.15)',
                                fontSize: '0.7rem', color: '#888', letterSpacing: '2px'
                            }}>
                                <span>POS</span>
                                <span>RACER</span>
                                <span style={{ textAlign: 'right' }}>TIME</span>
                            </div>

                            {/* Generate standings for all 4 racers */}
                            {(() => {
                                const allRacers = [
                                    { id: 'player', name: '🏎️ YOU (FERRARI)', speed: speedRef.current || 300 },
                                    { id: 'rival-1', name: '🟢 TURBO (LAMBO)', speed: 280 },
                                    { id: 'rival-2', name: '🟣 PHANTOM (PORSCHE)', speed: 310 },
                                    { id: 'rival-3', name: '🟡 THUNDER (MCLAREN)', speed: 295 },
                                ];

                                // Calculate estimated finish times
                                const standings = allRacers.map(racer => {
                                    const existing = finishTimes.find(f => f.id === racer.id);
                                    const estTime = existing ? existing.time : Math.round(RACE_DISTANCE / (racer.speed * 0.3));
                                    return { ...racer, time: estTime };
                                }).sort((a, b) => a.time - b.time);

                                return standings.map((racer, idx) => (
                                    <div key={racer.id} style={{
                                        display: 'grid', gridTemplateColumns: '40px 1fr 100px',
                                        padding: '14px 16px',
                                        background: racer.id === 'player' ? 'rgba(255,157,0,0.1)' : 'transparent',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{
                                            fontWeight: 'bold',
                                            fontSize: '1.2rem',
                                            color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#666'
                                        }}>
                                            {idx + 1}
                                        </span>
                                        <span style={{
                                            fontWeight: racer.id === 'player' ? '800' : '400',
                                            color: racer.id === 'player' ? '#ff9d00' : '#ddd',
                                            fontSize: '0.85rem'
                                        }}>
                                            {racer.name}
                                        </span>
                                        <span style={{
                                            textAlign: 'right',
                                            fontFamily: 'monospace',
                                            color: '#aaa',
                                            fontSize: '0.85rem'
                                        }}>
                                            {Math.floor(racer.time / 60)}:{(racer.time % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                ));
                            })()}
                        </div>

                        <button
                            className="nfs-button"
                            onClick={restart}
                            style={{ marginTop: '30px', padding: '14px 40px', fontSize: '0.9rem' }}
                        >
                            RACE AGAIN
                        </button>
                    </div>
                )}

                <MainScene
                    speed={speed}
                    npcs={npcs}
                    playerLane={playerLane}
                    isRaceActive={isRaceActive}
                    raceTime={raceTime}
                    onCollide={handleCollision}
                    playerDistance={playerDistance}
                    raceLength={RACE_DISTANCE}
                />

                {/* Speedometer */}
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    background: 'rgba(0,0,0,0.8)',
                    padding: '20px',
                    borderRadius: '50%',
                    border: `4px solid ${isBusted ? '#ff0000' : 'var(--primary)'}`,
                    width: '120px',
                    height: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    boxShadow: isBusted ? '0 0 20px #ff0000' : isRaceActive ? '0 0 20px #00ffcc' : 'none',
                    zIndex: 30
                }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Math.round(speed)}</span>
                    <span style={{ fontSize: '0.6rem' }}>KM/H</span>
                </div>

                {/* ON-SCREEN CONTROLS OVERLAY */}
                <div style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    right: '160px', // Leave space for speedometer
                    height: '100px',
                    zIndex: 40,
                    display: 'flex',
                    gap: '20px',
                    alignItems: 'flex-end',
                    pointerEvents: 'auto'
                }}>
                    {/* Game State Buttons */}
                    <div style={{ marginBottom: '10px' }}>
                        {(isCrashed || isBusted || isFinished) ? (
                            <button className="nfs-button" style={{ background: 'white', padding: '15px 30px' }} onClick={restart}>RE-ENTER</button>
                        ) : !isRaceActive && countdown === null ? (
                            <button className="nfs-button" style={{ padding: '15px 30px' }} onClick={startGrid}>START GRID</button>
                        ) : (
                            <button className="nfs-button" style={{ background: '#ff4444' }} onClick={restart}>RESTART</button>
                        )}
                    </div>

                    {/* Driving Controls (Mobile/Touch Friendly) */}
                    <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button className="nfs-button" style={{ width: '60px', height: '60px', padding: 0 }} onPointerDown={() => setPlayerLane(p => Math.max(-16, p - 2))}>⬅️</button>
                            <button className="nfs-button" style={{ width: '60px', height: '60px', padding: 0 }} onPointerDown={() => setPlayerLane(p => Math.min(16, p + 2))}>➡️</button>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', marginLeft: '20px' }}>
                            <button
                                className="nfs-button"
                                style={{ background: '#ff0000', width: '60px', height: '60px', padding: 0, opacity: isBraking ? 1 : 0.7 }}
                                onPointerDown={() => setIsBraking(true)}
                                onPointerUp={() => setIsBraking(false)}
                                onPointerLeave={() => setIsBraking(false)}
                            >🛑</button>
                            <button
                                className="nfs-button"
                                style={{ background: isAccelerating ? '#ff9d00' : '#444', width: '80px', height: '80px', padding: 0, fontSize: '1.5rem' }}
                                onPointerDown={() => setIsAccelerating(true)}
                                onPointerUp={() => setIsAccelerating(false)}
                                onPointerLeave={() => setIsAccelerating(false)}
                            >🚀</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
