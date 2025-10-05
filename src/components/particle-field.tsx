'use client';

import React, { useState, useEffect } from 'react';

const ParticleField = () => {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; speed: number; delay: number; xEnd: number }[]
  >([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    setIsMounted(true);
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 15 + 10,
      delay: Math.random() * 5,
      xEnd: Math.random() * 20 - 10,
    }));
    setParticles(newParticles);
  }, []); // The empty dependency array ensures this runs only once.

  if (!isMounted) {
    // Render nothing on the server and on the initial client render.
    return null;
  }

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={
            {
              left: `${p.x}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.speed}s`,
              animationDelay: `${p.delay}s`,
              '--x-end': `${p.xEnd}vw`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
};

export default ParticleField;
