'use client';

import React, { useRef } from 'react';
import { Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NPCCarProps {
    position: [number, number, number];
    color: string;
    type: 'rival' | 'police';
    speed: number;
    playerSpeed: number;
    playerLane: number;
    isRaceActive: boolean;
    onCollide: (type: 'rival' | 'police') => void;
}

export function NPCCar({ position, color, type, speed, playerSpeed, playerLane, isRaceActive, onCollide }: NPCCarProps) {
    const meshRef = useRef<THREE.Group>(null);
    const [isActive, setIsActive] = React.useState(type === 'rival');
    const [sirenColor, setSirenColor] = React.useState("#ff0000");

    useFrame((state, delta) => {
        if (!meshRef.current || !isRaceActive) return;

        // === POLICE ACTIVATION: When player drives past a parked police car ===
        if (type === 'police' && !isActive) {
            // Police car is parked on the roadside. Once it scrolls past Z >= 0
            // (meaning the player has driven past it), it activates.
            if (meshRef.current.position.z >= 0) {
                setIsActive(true);
            }
            // While parked, just scroll with the world (relative to player movement)
            meshRef.current.position.z += playerSpeed * delta * 0.15;
            return;
        }

        if (isActive) {
            if (type === 'police') {
                // === POLICE PURSUIT AI ===
                // Rubber-banding: speed up if behind, slow down if too far ahead
                let effectiveSpeed = speed;
                if (meshRef.current.position.z < -15) {
                    effectiveSpeed = playerSpeed + 20; // Close the gap fast
                } else if (meshRef.current.position.z > 8) {
                    effectiveSpeed = playerSpeed - 10; // Don't overshoot, stay near
                } else {
                    effectiveSpeed = playerSpeed + 5; // Slowly closing in
                }

                // Relative movement
                meshRef.current.position.z += (playerSpeed - effectiveSpeed) * delta * 0.15;

                // Aggressive lane interception — steer toward the player
                const steeringSpeed = meshRef.current.position.z > -30 ? 0.04 : 0.015;
                meshRef.current.position.x = THREE.MathUtils.lerp(
                    meshRef.current.position.x,
                    playerLane,
                    steeringSpeed
                );

                // Siren flash
                setSirenColor(Math.floor(state.clock.elapsedTime * 10) % 2 === 0 ? "#ff0000" : "#0000ff");
            } else {
                // === RIVAL: Normal race movement ===
                meshRef.current.position.z += (playerSpeed - speed) * delta * 0.15;
            }
        }

        // === COLLISION CHECK ===
        const dx = Math.abs(meshRef.current.position.x - playerLane);
        const dz = Math.abs(meshRef.current.position.z);

        if (dx < 2.0 && dz < 4.5) {
            onCollide(type);
        }

        // === RECYCLING ===
        if (type === 'rival') {
            if (meshRef.current.position.z > 100) meshRef.current.position.z = -500;
            if (meshRef.current.position.z < -600) meshRef.current.position.z = 100;
        }
        // Police cars that fall way behind get recycled as a new roadside ambush ahead
        if (type === 'police' && isActive && meshRef.current.position.z > 150) {
            meshRef.current.position.z = -500;
            meshRef.current.position.x = Math.random() > 0.5 ? 18 : -18;
            setIsActive(false);
        }
    });

    return (
        <group ref={meshRef} position={position}>
            <Float speed={isActive ? 3 : 0} rotationIntensity={0.1} floatIntensity={0.2}>
                {/* Car body */}
                <mesh castShadow>
                    <boxGeometry args={[2.1, 0.6, 4.8]} />
                    <meshStandardMaterial
                        color={type === 'police' ? (isActive ? '#111' : '#222') : color}
                        metalness={0.9}
                        roughness={0.1}
                    />
                </mesh>

                {/* Police light bar */}
                {type === 'police' && (
                    <mesh position={[0, 0.6, 0]}>
                        <boxGeometry args={[1, 0.2, 0.4]} />
                        <meshStandardMaterial
                            emissive={isActive ? sirenColor : "#333"}
                            emissiveIntensity={isActive ? 15 : 0.5}
                            color={isActive ? sirenColor : "#333"}
                        />
                    </mesh>
                )}

                {/* Police text stripe */}
                {type === 'police' && (
                    <mesh position={[0, 0.31, 0]}>
                        <boxGeometry args={[2.12, 0.05, 1.5]} />
                        <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.5} />
                    </mesh>
                )}

                {/* Rival cabin */}
                {type === 'rival' && (
                    <mesh position={[0, 0.6, 0.5]}>
                        <boxGeometry args={[1.7, 0.5, 2.2]} />
                        <meshStandardMaterial color="#111" metalness={1} roughness={0.05} />
                    </mesh>
                )}

                {/* Headlights */}
                <mesh position={[0.8, 0.3, -2.3]}>
                    <sphereGeometry args={[0.15]} />
                    <meshStandardMaterial emissive="#fff" emissiveIntensity={2} />
                </mesh>
                <mesh position={[-0.8, 0.3, -2.3]}>
                    <sphereGeometry args={[0.15]} />
                    <meshStandardMaterial emissive="#fff" emissiveIntensity={2} />
                </mesh>
            </Float>
        </group>
    );
}
