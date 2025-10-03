'use client';

import { useMemo } from 'react';

const Particle = ({ style }: { style: React.CSSProperties }) => (
  <div
    className="absolute rounded-full bg-accent"
    style={style}
  />
);

export default function ParticleField() {
  const particles = useMemo(() => {
    const particleList = [];
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      const size = Math.random() * 3 + 1;
      const duration = Math.random() * 20 + 20; // Slower: 20s to 40s
      const delay = Math.random() * -40; // Stagger start times
      const startX = Math.random() * 100;
      const endX = (Math.random() - 0.5) * 40; // Reduce horizontal drift

      particleList.push(
        <Particle
          key={i}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            left: `${startX}vw`,
            bottom: `-${size}px`,
            animation: `float ${duration}s linear ${delay}s infinite`,
            opacity: Math.random() * 0.5 + 0.1,
            '--x-end': endX,
          } as React.CSSProperties}
        />
      );
    }
    return particleList;
  }, []);

  return <div className="particle-field">{particles}</div>;
}
