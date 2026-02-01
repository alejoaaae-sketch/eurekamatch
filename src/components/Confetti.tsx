import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  type: 'confetti' | 'sparkle';
}

const colors = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.8)',
  '#FFD700',
  '#FF69B4',
  '#00CED1',
  '#FF6347',
  '#9370DB',
];

const Confetti = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    
    // Create confetti particles
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        type: 'confetti',
      });
    }
    
    // Create sparkle particles
    for (let i = 50; i < 70; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 1.5 + Math.random() * 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        type: 'sparkle',
      });
    }
    
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={particle.type === 'confetti' ? 'confetti-piece' : 'sparkle-piece'}
          style={{
            left: `${particle.x}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            backgroundColor: particle.type === 'confetti' ? particle.color : 'transparent',
            width: particle.size,
            height: particle.type === 'confetti' ? particle.size * 0.6 : particle.size,
            boxShadow: particle.type === 'sparkle' 
              ? `0 0 ${particle.size}px ${particle.color}, 0 0 ${particle.size * 2}px ${particle.color}`
              : 'none',
          }}
        />
      ))}
      
      {/* Burst effect */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[...Array(12)].map((_, i) => (
          <div
            key={`burst-${i}`}
            className="burst-particle"
            style={{
              '--rotation': `${i * 30}deg`,
              '--color': colors[i % colors.length],
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
};

export default Confetti;
