import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BreathingCircle } from '@/components/BreathingCircle';
import { FocusStats } from '@/components/FocusStats';
import { NudgeAlert } from '@/components/NudgeAlert';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { Play, Square } from 'lucide-react';

const Index = () => {
  const { isTracking, focusLevel, isFaceDetected, startTracking, stopTracking } = useFaceTracking();
  const [sessionDuration, setSessionDuration] = useState(0);
  const [nudgeCount, setNudgeCount] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [lowFocusDuration, setLowFocusDuration] = useState(0);

  // Session timer
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking]);

  // Nudge system - trigger when focus < 50% for 30+ seconds
  useEffect(() => {
    if (!isTracking) return;

    if (focusLevel < 50) {
      setLowFocusDuration((prev) => prev + 1);

      if (lowFocusDuration >= 30 && !showNudge) {
        setShowNudge(true);
        setNudgeCount((prev) => prev + 1);
        setLowFocusDuration(0);
      }
    } else {
      setLowFocusDuration(0);
    }
  }, [focusLevel, isTracking, lowFocusDuration, showNudge]);

  const handleStart = () => {
    startTracking();
    setSessionDuration(0);
    setNudgeCount(0);
    setLowFocusDuration(0);
  };

  const handleStop = () => {
    stopTracking();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      <NudgeAlert isVisible={showNudge} onDismiss={() => setShowNudge(false)} />

      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-headline font-bold text-foreground mb-2">
            Nudge
          </h1>
          <p className="text-lg font-body text-muted-foreground tracking-wide">
            The Mindful Focus System
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 flex-1 flex flex-col items-center justify-center gap-16">
        {/* Breathing Circle */}
        <div className="flex flex-col items-center gap-8">
          <BreathingCircle isFocused={isFaceDetected} focusLevel={focusLevel} />
          
          {isTracking && (
            <p className="text-sm font-body text-center max-w-md text-muted-foreground">
              {isFaceDetected
                ? 'You are focused. Stay present with your breath.'
                : 'Look at the screen and find your center.'}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          {!isTracking ? (
            <Button
              onClick={handleStart}
              size="lg"
              className="font-body font-medium px-8 py-6 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-500 ease-zen"
            >
              <Play className="w-5 h-5 mr-2" />
              Begin Session
            </Button>
          ) : (
            <Button
              onClick={handleStop}
              size="lg"
              variant="outline"
              className="font-body font-medium px-8 py-6 text-lg rounded-full border-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-500 ease-zen"
            >
              <Square className="w-5 h-5 mr-2" />
              End Session
            </Button>
          )}
        </div>

        {/* Stats */}
        {isTracking && (
          <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom duration-700">
            <FocusStats
              sessionDuration={sessionDuration}
              focusLevel={focusLevel}
              nudgeCount={nudgeCount}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center">
        <p className="text-sm font-body text-muted-foreground">
          Breathe deeply. Stay present. Find your flow.
        </p>
      </footer>
    </div>
  );
};

export default Index;
