'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stars, Float } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { Suspense, useRef, useMemo } from 'react';
import { ProceduralCity } from './ProceduralCity';
import { NPCCar } from './NPCCar';
import * as THREE from 'three';

function FerrariModel({ lane = 0 }: { lane?: number }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, lane, 0.1);
            groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, (groupRef.current.position.x - lane) * 0.1, 0.1);
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, (lane - groupRef.current.position.x) * 0.05, 0.1);
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
            <group ref={groupRef}>
                <mesh position={[0, 0.35, 0]} castShadow>
                    <boxGeometry args={[2.3, 0.3, 5.2]} />
                    <meshStandardMaterial color="#b30000" metalness={1} roughness={0.1} />
                </mesh>
                <mesh position={[0, 0.3, -2.4]} rotation={[-0.15, 0, 0]} castShadow>
                    <boxGeometry args={[2.0, 0.2, 0.8]} />
                    <meshStandardMaterial color="#b30000" metalness={1} roughness={0.1} />
                </mesh>
                <mesh position={[0, 0.7, 0.6]} castShadow>
                    <boxGeometry args={[1.6, 0.5, 2.2]} />
                    <meshStandardMaterial color="#111" metalness={1} roughness={0} transparent opacity={0.8} />
                </mesh>
                {[[-1.1, 0.4, -1.8], [1.1, 0.4, -1.8], [-1.1, 0.4, 1.8], [1.1, 0.4, 1.8]].map((pos, i) => (
                    <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.45, 0.45, 0.4, 32]} />
                        <meshStandardMaterial color="#050505" roughness={0.2} metalness={0.8} />
                    </mesh>
                ))}
                <mesh position={[0.8, 0.4, -2.6]}>
                    <sphereGeometry args={[0.15]} />
                    <meshStandardMaterial emissive="#00f2ff" emissiveIntensity={5} color="#fff" />
                </mesh>
                <mesh position={[-0.8, 0.4, -2.6]}>
                    <sphereGeometry args={[0.15]} />
                    <meshStandardMaterial emissive="#00f2ff" emissiveIntensity={5} color="#fff" />
                </mesh>
            </group>
        </Float>
    );
}

function Road({ speed = 0 }: { speed?: number }) {
    const lineRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (lineRef.current) {
            lineRef.current.position.z = (lineRef.current.position.z + (speed * delta * 0.15)) % 20;
        }
    });
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
                <planeGeometry args={[50, 4000]} />
                <meshStandardMaterial color="#0a0a0a" roughness={0.6} metalness={0.1} />
            </mesh>
            <group ref={lineRef}>
                {Array.from({ length: 100 }).map((_, i) => (
                    <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -1000 + i * 20]}>
                        <planeGeometry args={[0.5, 12]} />
                        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1} />
                    </mesh>
                ))}
            </group>
        </group>
    );
}

export interface NPCCarData {
    id: string;
    type: 'rival' | 'police';
    color: string;
    speed: number;
    lane: number;
    initialZ: number;
}

interface MainSceneProps {
    speed: number;
    npcs: NPCCarData[];
    playerLane: number;
    isRaceActive: boolean;
    raceTime: number;
    onCollide: () => void;
}

export default function MainScene({ speed, npcs, playerLane, isRaceActive, raceTime, onCollide }: MainSceneProps) {
    const composerKey = useMemo(() => Math.random(), []);

    // Calculate Environment color based on race time
    const { fogColor, skyColor, intensity, preset } = useMemo(() => {
        if (raceTime < 60) {
            return {
                fogColor: '#050505',
                skyColor: '#000000',
                intensity: 0.15,
                preset: 'night' as any
            };
        } else if (raceTime < 180) {
            // Sunrise transition (60s to 180s)
            const factor = Math.min(1, (raceTime - 60) / 120);
            return {
                fogColor: new THREE.Color('#050505').lerp(new THREE.Color('#ff4d00'), factor * 0.5).getStyle(),
                skyColor: new THREE.Color('#000000').lerp(new THREE.Color('#220044'), factor).getStyle(),
                intensity: 0.15 + factor * 0.5,
                preset: factor > 0.5 ? 'sunset' : 'night' as any
            };
        } else {
            // High Heat / Intense Day
            return {
                fogColor: '#ff9d00',
                skyColor: '#331100',
                intensity: 1.0,
                preset: 'sunset' as any
            };
        }
    }, [raceTime]);

    return (
        <div style={{ width: '100%', height: '100%', background: skyColor }}>
            <Canvas shadows gl={{ antialias: false }} dpr={[1, 2]}>
                <Suspense fallback={null}>
                    <color attach="background" args={[skyColor]} />
                    <fog attach="fog" args={[fogColor, 10, 280]} />
                    <PerspectiveCamera makeDefault position={[0, 5, 15]} />

                    <ambientLight intensity={intensity} />
                    <directionalLight
                        position={[10, 20, 5]}
                        intensity={intensity * 2}
                        castShadow
                        color={raceTime > 60 ? '#ffccaa' : '#ffffff'}
                    />

                    <FerrariModel lane={playerLane} />

                    {npcs.map(npc => (
                        <NPCCar
                            key={npc.id}
                            type={npc.type}
                            color={npc.color}
                            speed={npc.speed}
                            playerSpeed={speed}
                            playerLane={playerLane}
                            isRaceActive={isRaceActive}
                            onCollide={onCollide}
                            position={[npc.lane, 0, npc.initialZ]}
                        />
                    ))}

                    <ProceduralCity speed={speed} density={0.4} />
                    <Road speed={speed} />

                    <Stars radius={250} depth={50} count={5000} factor={4} saturation={1} fade speed={1} />
                    <Environment preset={preset} />

                    <EffectComposer key={composerKey}>
                        <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={1.5} />
                        <Noise opacity={0.05} />
                        <Vignette eskil={false} offset={0.1} darkness={1.1} />
                    </EffectComposer>
                </Suspense>
            </Canvas>
        </div>
    );
}
