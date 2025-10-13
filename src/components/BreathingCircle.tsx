import { useEffect, useState } from 'react';

interface BreathingCircleProps {
  isFocused: boolean;
  focusLevel: number;
}

export const BreathingCircle = ({ isFocused, focusLevel }: BreathingCircleProps) => {
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale'>('inhale');

  useEffect(() => {
    const interval = setInterval(() => {
      setBreathPhase((prev) => (prev === 'inhale' ? 'exhale' : 'inhale'));
    }, 4000); // 4 second cycle

    return () => clearInterval(interval);
  }, []);

  const getCircleOpacity = () => {
    if (focusLevel > 70) return 'opacity-90';
    if (focusLevel > 40) return 'opacity-70';
    return 'opacity-50';
  };

  const getCircleColor = () => {
    if (focusLevel > 70) return 'from-primary to-accent';
    if (focusLevel > 40) return 'from-accent to-primary';
    return 'from-destructive/60 to-accent';
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Ambient ripples */}
      {isFocused && (
        <>
          <div className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-ripple" />
          <div className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-ripple [animation-delay:750ms]" />
        </>
      )}
      
      {/* Main breathing circle */}
      <div
        className={`
          relative w-48 h-48 rounded-full
          bg-gradient-to-br ${getCircleColor()}
          ${getCircleOpacity()}
          animate-breathe
          shadow-2xl
          transition-all duration-500 ease-zen
        `}
      >
        {/* Inner glow */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
        
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-background animate-pulse-glow" />
        </div>
      </div>

      {/* Breath phase indicator */}
      <div className="absolute -bottom-12 text-center">
        <p className="text-sm font-body text-muted-foreground capitalize tracking-wider">
          {breathPhase}
        </p>
      </div>
    </div>
  );
};
