import { useState, useEffect, useRef } from 'react';
import { NudgeAlert, AlertSeverity } from '@/components/NudgeAlert';
import { CameraPreview } from '@/components/CameraPreview';
import { ActiveSessionSidebar } from '@/components/ActiveSessionSidebar';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const Track = () => {
  const { isTracking, focusLevel, isFaceDetected, stream, startTracking, stopTracking, distractionCount } = useFaceTracking();
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState<AlertSeverity>('standard');
  const [lowFocusDuration, setLowFocusDuration] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [focusLevels, setFocusLevels] = useState<number[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [avgDistractions, setAvgDistractions] = useState<number | null>(null);
  const focusLevelRef = useRef(focusLevel);
  const navigate = useNavigate();

  // Keep ref in sync with current focus level
  useEffect(() => {
    focusLevelRef.current = focusLevel;
  }, [focusLevel]);

  // Check authentication and load average distractions
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to access focus tracking');
        navigate('/auth');
        return;
      }

      // Fetch past sessions to calculate average distractions
      try {
        const { data: sessions, error } = await supabase
          .from('focus_sessions')
          .select('nudge_count')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10); // Last 10 sessions

        if (error) throw error;

        if (sessions && sessions.length > 0) {
          const totalDistractions = sessions.reduce((sum, s) => sum + (s.nudge_count || 0), 0);
          const average = totalDistractions / sessions.length;
          setAvgDistractions(Math.round(average * 10) / 10); // Round to 1 decimal
        } else {
          setAvgDistractions(0);
        }
      } catch (error) {
        console.error('Error fetching session stats:', error);
        setAvgDistractions(null);
      }
    };
    checkAuth();
  }, [navigate]);

  // Auto-start session when page loads
  useEffect(() => {
    if (!isTracking) {
      console.log('Starting tracking...');
      startTracking();
      setSessionDuration(0);
      setLowFocusDuration(0);
      setSessionStartTime(new Date());
      setFocusLevels([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debug: Log stream state
  useEffect(() => {
    console.log('Stream state:', { stream, isTracking, streamExists: !!stream });
  }, [stream, isTracking]);

  // Session timer and focus level tracking with tiered alerts
  useEffect(() => {
    if (!isTracking || isPaused) return;

    const interval = setInterval(() => {
      setSessionDuration((prev) => prev + 1);


      // Use ref to get current focus level
      const currentFocus = focusLevelRef.current;
      setFocusLevels((prev) => [...prev, currentFocus]);

      // Tiered alert system based on focus level
      if (currentFocus < 30) {
        // STRONG ALERT: Critical distraction - alert after 3 seconds
        setLowFocusDuration((prevDuration) => {
          const newDuration = prevDuration + 1;
          if (newDuration >= 3) {
            setAlertSeverity('strong');
            setShowNudge(true);
            return 0; // Reset after nudge
          }
          return newDuration;
        });
      } else if (currentFocus < 55) {
        // STANDARD ALERT: Moderate distraction - alert after 5 seconds
        setLowFocusDuration((prevDuration) => {
          const newDuration = prevDuration + 1;
          if (newDuration >= 5) {
            setAlertSeverity('standard');
            setShowNudge(true);
            return 0; // Reset after nudge
          }
          return newDuration;
        });
      } else {
        // Good focus - reset duration tracker
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const avgFocusLevel =
          focusLevels.length > 0 ? focusLevels.reduce((sum, level) => sum + level, 0) / focusLevels.length : 0;

        const { error } = await supabase
          .from('focus_sessions')
          .insert({
            user_id: user.id,
            session_duration: sessionDuration,
            nudge_count: distractionCount,
            average_focus_level: avgFocusLevel,
            started_at: sessionStartTime.toISOString(),
            ended_at: new Date().toISOString(),
          });

        if (error) throw error;
        toast.success("Session saved successfully");
        navigate("/dashboard");
      } catch (error) {
        console.error("Error saving session:", error);
        toast.error("Failed to save session data");
      }
    } else {
      navigate("/dashboard");
    }
  };

  const handleTakeBreak = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      toast.info("Break started - session paused");
    } else {
      toast.success("Session resumed");
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col w-full">
        <Header />
        <NudgeAlert isVisible={showNudge} onDismiss={() => setShowNudge(false)} severity={alertSeverity} />

        <div className="flex w-full flex-1 overflow-hidden">
          {/* Center: Camera Preview */}
          <main className="flex-1 container mx-auto px-6 py-8 flex flex-col items-center justify-center overflow-y-auto">
            {stream ? (
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="flex items-center gap-4 w-full max-w-3xl">
                  <SidebarTrigger className="shrink-0" />
                  <p className="text-sm font-body text-muted-foreground">Camera Preview</p>
                </div>
                <CameraPreview stream={stream} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
                <div className="flex items-center gap-4 w-full">
                  <SidebarTrigger className="shrink-0" />
                  <p className="text-sm font-body text-muted-foreground">Initializing Camera...</p>
                </div>
                <div className="w-full h-[500px] rounded-lg border-2 border-dashed border-border bg-muted/50 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="animate-pulse">
                      <svg className="w-16 h-16 mx-auto text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground">
                      {isTracking ? 'Starting camera...' : 'Please allow camera access'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Right: Active Session Sidebar */}
          <ActiveSessionSidebar
            sessionDuration={sessionDuration}
            focusLevel={focusLevel}
            nudgeCount={distractionCount}
            focusHistory={focusLevels}
            isPaused={isPaused}
            avgDistractions={avgDistractions}
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
