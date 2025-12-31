import React from 'react';

interface StarBackgroundProps {
  children: React.ReactNode;
}

export const StarBackground: React.FC<StarBackgroundProps> = ({ children }) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background:
          'linear-gradient(45deg, #0a0a0a, #1a1a2a, #0a0a0a, #1a1a2a)',
        overflow: 'hidden'
      }}
    >
      {/* Punk-style stars with random blinking */}
      {Array.from({ length: 200 }).map((_, i) => {
        const size = Math.random() * 4 + 1;
        const delay = Math.random() * 5;
        const duration = Math.random() * 3 + 1;
        const color = Math.random() > 0.5 ? '#ff00ff' : '#00ffff'; // Punk colors: magenta and cyan

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? '0%' : '50%',
              opacity: 0,
              animation: `blink-${i % 10} ${duration}s infinite`,
              animationDelay: `${delay}s`,
              boxShadow: `0 0 ${size * 2}px ${color}`
            }}
          />
        );
      })}

      {/* Content container */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}
      >
        {children}
      </div>
    </div>
  );
};
