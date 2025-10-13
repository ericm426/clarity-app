import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { NudgeAlert } from '@/components/NudgeAlert';
import { CameraPreview } from '@/components/CameraPreview';
import { ActiveSessionSidebar } from '@/components/ActiveSessionSidebar';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const Track = () => {
  const { isTracking, focusLevel, isFaceDetected, stream, startTracking, stopTracking } = useFaceTracking();
  const [sessionDuration, setSessionDuration] = useState(0);
  const [nudgeCount, setNudgeCount] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [lowFocusDuration, setLowFocusDuration] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [focusLevels, setFocusLevels] = useState<number[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const focusLevelRef = useRef(focusLevel);
  const navigate = useNavigate();

  // Keep ref in sync with current focus level
  useEffect(() => {
    focusLevelRef.current = focusLevel;
  }, [focusLevel]);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to access focus tracking');
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]);

  // Auto-start session when page loads
  useEffect(() => {
    if (!isTracking) {
      startTracking();
      setSessionDuration(0);
      setNudgeCount(0);
      setLowFocusDuration(0);
      setSessionStartTime(new Date());
      setFocusLevels([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session timer and focus level tracking
  useEffect(() => {
    if (!isTracking || isPaused) return;

    const interval = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
      
      // Use ref to get current focus level
      const currentFocus = focusLevelRef.current;
      setFocusLevels((prev) => [...prev, currentFocus]);
      
      // Track low focus duration
      if (currentFocus < 50) {
        setLowFocusDuration((prevDuration) => {
          const newDuration = prevDuration + 1;
          // Trigger nudge at 30 seconds
          if (newDuration >= 30) {
            setShowNudge(true);
            setNudgeCount((count) => count + 1);
            return 0; // Reset after nudge
          }
          return newDuration;
        });
      } else {
        setLowFocusDuration(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, isPaused]);

  const handleStop = async () => {
    stopTracking();
    
    // Save session data
    if (sessionStartTime && sessionDuration > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const avgFocusLevel = focusLevels.length > 0
          ? focusLevels.reduce((sum, level) => sum + level, 0) / focusLevels.length
          : 0;

        const { error } = await supabase
          .from('focus_sessions')
          .insert({
            user_id: user.id,
            session_duration: sessionDuration,
            nudge_count: nudgeCount,
            average_focus_level: avgFocusLevel,
            started_at: sessionStartTime.toISOString(),
            ended_at: new Date().toISOString(),
          });

        if (error) throw error;
        toast.success('Session saved successfully');
        navigate('/dashboard');
      } catch (error) {
        console.error('Error saving session:', error);
        toast.error('Failed to save session data');
      }
    } else {
      navigate('/dashboard');
    }
  };

  const handleTakeBreak = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      toast.info('Break started - session paused');
    } else {
      toast.success('Session resumed');
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col w-full">
        <Header />
        <NudgeAlert isVisible={showNudge} onDismiss={() => setShowNudge(false)} />

        <div className="flex w-full flex-1">
          {/* Main Content - Camera Preview */}
          <main className="flex-1 container mx-auto px-6 py-8 flex flex-col items-center justify-center">
            {stream && (
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="flex items-center gap-4 w-full max-w-3xl">
                  <SidebarTrigger className="shrink-0" />
                  <p className="text-sm font-body text-muted-foreground">Camera Preview</p>
                </div>
                <CameraPreview stream={stream} />
              </div>
            )}
          </main>

          {/* Right: Active Session Sidebar */}
          <ActiveSessionSidebar
            sessionDuration={sessionDuration}
            focusLevel={focusLevel}
            nudgeCount={nudgeCount}
            focusHistory={focusLevels}
            isPaused={isPaused}
            onEndSession={handleStop}
            onTakeBreak={handleTakeBreak}
          />
        </div>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-4 text-center border-t">
          <p className="text-sm font-body text-muted-foreground">
            Professional attention analytics. Data-driven insights.
          </p>
        </footer>
      </div>
    </SidebarProvider>
  );
};

export default Track;
