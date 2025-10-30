import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export const AnimatedShowcase = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [focusLevel, setFocusLevel] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [focusHistory, setFocusHistory] = useState<number[]>([]);
  const showcaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (showcaseRef.current) {
      observer.observe(showcaseRef.current);
    }

    return () => {
      if (showcaseRef.current) {
        observer.unobserve(showcaseRef.current);
      }
    };
  }, []);

  // Animate focus level and build history
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setFocusLevel((prev) => {
        const target = 85 + Math.sin(Date.now() / 1000) * 10;
        const newValue = prev + (target - prev) * 0.1;
        
        // Add to history
        setFocusHistory((prevHistory) => {
          const newHistory = [...prevHistory, Math.round(newValue)];
          return newHistory.slice(-30); // Keep only last 30 points
        });
        
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Animate session time
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setSessionTime((prev) => (prev + 1) % 3600);
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const graphData = focusHistory.map((value, index) => ({
    index,
    focus: value
  }));

  return (
    <div
      ref={showcaseRef}
      className={`transition-all duration-1000 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Left: Description */}
        <div className="space-y-6 order-2 md:order-1">
          <div className="space-y-4">
            <h3 className="text-3xl md:text-4xl font-headline font-semibold text-foreground">
              Live Focus Tracking
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Experience real-time attention monitoring with intelligent analytics. 
              Watch as the system tracks your focus patterns second by second.
            </p>
          </div>
          
          <div className="space-y-3 pt-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-muted-foreground">
                Continuous monitoring captures every moment of concentration
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-muted-foreground">
                Real-time graphs visualize your attention over the last 30 seconds
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              <p className="text-muted-foreground">
                Track distractions and compare against your personal averages
              </p>
            </div>
          </div>
        </div>

        {/* Right: Live demo matching actual GUI */}
        <div className="space-y-6 order-1 md:order-2">
          {/* Session Time */}
          <div>
            <p className="text-sm text-muted-foreground font-body mb-2">Time</p>
            <p className="text-4xl font-mono font-bold text-foreground">
              {formatTime(sessionTime)}
            </p>
          </div>

          {/* Focus Score */}
          <div>
            <p className="text-sm text-muted-foreground font-body mb-2">Focus score</p>
            <p className="text-4xl font-mono font-bold text-primary">
              {Math.round(focusLevel)}%
            </p>
          </div>

          {/* Real-time Graph */}
          <Card className="p-4 bg-card border-border">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-body mb-3">
              Last 30 sec attention
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={graphData}>
                <YAxis hide domain={[0, 100]} />
                <Line 
                  type="monotone" 
                  dataKey="focus" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  animationDuration={200}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Distractions */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-card border-border">
              <p className="text-xs text-muted-foreground font-body mb-1">Distractions</p>
              <p className="text-2xl font-mono font-bold text-foreground">
                0
              </p>
            </Card>
            <Card className="p-4 bg-muted/30 border-border">
              <p className="text-xs text-muted-foreground font-body mb-1">Avg per session</p>
              <p className="text-2xl font-mono font-bold text-muted-foreground">
                1.6
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
