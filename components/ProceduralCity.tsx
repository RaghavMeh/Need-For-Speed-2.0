'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Box, Cylinder } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CityProps {
    density?: number;
    areaSize?: number;
    speed?: number;
}

export function ProceduralCity({ density = 0.35, areaSize = 150, speed = 0 }: CityProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useFrame((state, delta) => {
        if (speed > 0) {
            setOffset(prev => (prev + (speed * delta * 0.15)) % areaSize);
        }
    });

    const cityElements = useMemo(() => {
        if (!isMounted) return [];

        const list = [];
        const step = 12; // Increased step for larger buildings
        const roadWidth = 18;

        for (let x = -areaSize / 2; x < areaSize / 2; x += step) {
            if (Math.abs(x) < roadWidth) {
                if (Math.abs(x) > roadWidth - 3) {
                    for (let z = -areaSize / 2; z < areaSize / 2; z += 25) {
                        list.push({
                            type: 'light',
                            position: [x > 0 ? roadWidth - 1 : -(roadWidth - 1), 6, z],
                            color: '#ffcc00'
                        });
                    }
                }
                continue;
            }

            for (let z = -areaSize / 2; z < areaSize / 2; z += step) {
                if (Math.random() < density) {
                    const height = 20 + Math.random() * 60;
                    const width = 8 + Math.random() * 8;
                    const depth = 8 + Math.random() * 8;

                    // Variety of building styles
                    const style = Math.floor(Math.random() * 3);

                    list.push({
                        type: 'building',
                        position: [x, 0, z] as [number, number, number],
                        height,
                        width,
                        depth,
                        style,
                        color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.55, 0.1, 0.1).getStyle(),
                        emissive: Math.random() > 0.5 ? '#1a1a40' : '#000',
                    });
                }
            }
        }
        return list;
    }, [density, areaSize, isMounted]);

    if (!isMounted) return null;

    return (
        <group position={[0, 0, offset]}>
            <CitySection elements={cityElements} />
            <group position={[0, 0, -areaSize]}>
                <CitySection elements={cityElements} />
            </group>
            <group position={[0, 0, areaSize]}>
                <CitySection elements={cityElements} />
            </group>
        </group>
    );
}

function Building({ el }: { el: any }) {
    const { width, height, depth, color, emissive, style } = el;

    return (
        <group position={el.position}>
            {/* Main Structure */}
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial
                    color={color}
                    metalness={0.7}
                    roughness={0.3}
                />
            </mesh>

            {/* Windows / Detail */}
            <mesh position={[0, height / 2, 0]}>
                <boxGeometry args={[width + 0.1, height * 0.9, depth + 0.1]} />
                <meshStandardMaterial
                    color="#000"
                    transparent
                    opacity={0.4}
                    wireframe
                    emissive={style === 0 ? "#ffcc00" : style === 1 ? "#00f2ff" : "#ffffff"}
                    emissiveIntensity={0.8}
                />
            </mesh>

            {/* Roof Details */}
            <mesh position={[0, height + 1, 0]} castShadow>
                <boxGeometry args={[width * 0.7, 2, depth * 0.7]} />
                <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
            </mesh>

            {style === 2 && (
                <mesh position={[0, height + 4, 0]}>
                    <cylinderGeometry args={[0.1, 0.1, 6]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            )}

            {/* Base */}
            <mesh position={[0, 1, 0]}>
                <boxGeometry args={[width + 1, 2, depth + 1]} />
                <meshStandardMaterial color="#111" />
            </mesh>
        </group>
    );
}

function CitySection({ elements }: { elements: any[] }) {
    return (
        <>
            {elements.map((el, i) => {
                if (el.type === 'building') {
                    return <Building key={i} el={el} />;
                } else {
                    return (
                        <group key={i} position={el.position}>
                            <Cylinder args={[0.1, 0.1, 12]} position={[0, -3, 0]}>
                                <meshStandardMaterial color="#333" />
                            </Cylinder>
                            <mesh position={[0, 4, 0]}>
                                <sphereGeometry args={[0.4]} />
                                <meshStandardMaterial emissive={el.color} emissiveIntensity={4} color={el.color} />
                            </mesh>
                        </group>
                    );
                }
            })}
        </>
    );
}
