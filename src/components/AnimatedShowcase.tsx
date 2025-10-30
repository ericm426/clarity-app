import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Eye, Brain, TrendingUp } from 'lucide-react';

export const AnimatedShowcase = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [focusLevel, setFocusLevel] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
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

  // Animate focus level
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setFocusLevel((prev) => {
        const target = 85 + Math.sin(Date.now() / 1000) * 10;
        return prev + (target - prev) * 0.1;
      });
    }, 50);

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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={showcaseRef}
      className={`transition-all duration-1000 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      <Card className="p-8 bg-gradient-to-br from-background to-muted/20 border-border/50">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left: Live demo */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
              <Badge variant="outline" className="text-xs">
                Live Session
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Focus Level
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {Math.round(focusLevel)}%
                  </span>
                </div>
                <Progress value={focusLevel} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Session Time
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatTime(sessionTime)}
                  </span>
                </div>
                <Progress value={(sessionTime / 3600) * 100} className="h-2" />
              </div>

              <div className="pt-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-foreground">
                  Performance: Excellent
                </span>
              </div>
            </div>
          </div>

          {/* Right: Description */}
          <div className="space-y-4">
            <h3 className="text-2xl font-headline font-semibold text-foreground">
              Real-time Focus Tracking
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Watch your attention levels in real-time as our intelligent system monitors 
              your focus patterns and provides instant feedback.
            </p>
            <div className="space-y-2 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <p className="text-sm text-muted-foreground">
                  Camera-based tracking analyzes your attention without intrusion
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <p className="text-sm text-muted-foreground">
                  Instant alerts when your focus starts to drift
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <p className="text-sm text-muted-foreground">
                  Detailed analytics show your productivity patterns
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
