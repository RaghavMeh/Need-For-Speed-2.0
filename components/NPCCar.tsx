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
    onCollide: () => void;
}

export function NPCCar({ position, color, type, speed, playerSpeed, playerLane, isRaceActive, onCollide }: NPCCarProps) {
    const meshRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (meshRef.current && isRaceActive) {
            // Relative movement: (NPC_base_speed - player_actual_speed)
            meshRef.current.position.z += (playerSpeed - speed) * delta * 0.15;

            // Collision Check
            // Player is effectively at Z=0 and X=playerLane in the world view
            const dx = Math.abs(meshRef.current.position.x - playerLane);
            const dz = Math.abs(meshRef.current.position.z);

            // Car dimensions are approx 2.3m wide and 5.2m long
            // Using slightly smaller bounds for "fairness"
            if (dx < 2.0 && dz < 4.5) {
                onCollide();
            }

            // Infinite loop NPCs
            if (meshRef.current.position.z > 100) meshRef.current.position.z = -500;
            if (meshRef.current.position.z < -600) meshRef.current.position.z = 100;
        }
    });

    return (
        <group ref={meshRef} position={position}>
            <Float speed={isRaceActive ? 3 : 1} rotationIntensity={0.1} floatIntensity={0.2}>
                <mesh castShadow>
                    <boxGeometry args={[2.1, 0.6, 4.8]} />
                    <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
                </mesh>

                {/* Police specific details */}
                {type === 'police' && (
                    <mesh position={[0, 0.6, 0]}>
                        <boxGeometry args={[1, 0.2, 0.4]} />
                        <meshStandardMaterial emissive={Math.sin(Date.now() * 0.01) > 0 ? "#ff0000" : "#0000ff"} emissiveIntensity={10} />
                    </mesh>
                )}

                {/* Rival Cabin */}
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
