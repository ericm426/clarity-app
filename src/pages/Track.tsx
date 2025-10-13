import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FocusStats } from '@/components/FocusStats';
import { NudgeAlert } from '@/components/NudgeAlert';
import { CameraPreview } from '@/components/CameraPreview';
import { SessionMetrics } from '@/components/SessionMetrics';
import { ActiveSessionSidebar } from '@/components/ActiveSessionSidebar';
import { useFaceTracking } from '@/hooks/useFaceTracking';
import { Play, Square, BarChart3, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Track = () => {
  const { isTracking, focusLevel, isFaceDetected, stream, startTracking, stopTracking } = useFaceTracking();
  const [sessionDuration, setSessionDuration] = useState(0);
  const [nudgeCount, setNudgeCount] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [lowFocusDuration, setLowFocusDuration] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [focusLevels, setFocusLevels] = useState<number[]>([]);
  const navigate = useNavigate();

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

  // Session timer and focus level tracking
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
      setFocusLevels((prev) => [...prev, focusLevel]);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, focusLevel]);

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
    setSessionStartTime(new Date());
    setFocusLevels([]);
  };

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
      } catch (error) {
        console.error('Error saving session:', error);
        toast.error('Failed to save session data');
      }
    }
  };

  const handleTakeBreak = () => {
    toast.info('Break started - session paused');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      <Header />
      <NudgeAlert isVisible={showNudge} onDismiss={() => setShowNudge(false)} />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 flex-1">
        <Tabs defaultValue="track" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="track" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Track Session
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              View Metrics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="track" className="mt-8">
            {/* Active Session Split Screen */}
            {isTracking ? (
              <div className="flex gap-8 max-w-7xl mx-auto">
                {/* Left: Main Work Area */}
                <div className="flex-1 space-y-6">
                  {stream && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm font-body text-muted-foreground mb-2">Camera Preview</p>
                      <CameraPreview stream={stream} />
                    </div>
                  )}
                  
                  <div className="p-8 border-2 border-dashed border-border rounded-lg bg-muted/20 min-h-[400px] flex items-center justify-center">
                    <p className="text-muted-foreground font-body text-center">
                      Your work area<br />
                      <span className="text-sm">Focus on your tasks while we track your attention</span>
                    </p>
                  </div>
                </div>

                {/* Right: Active Session Sidebar */}
                <aside className="w-full max-w-sm">
                  <ActiveSessionSidebar
                    sessionDuration={sessionDuration}
                    focusLevel={focusLevel}
                    nudgeCount={nudgeCount}
                    focusHistory={focusLevels}
                    onEndSession={handleStop}
                    onTakeBreak={handleTakeBreak}
                  />
                </aside>
              </div>
            ) : (
              /* Before Session Starts */
              <div className="flex flex-col items-center gap-16">
                <div className="flex gap-4">
                  <Button
                    onClick={handleStart}
                    size="lg"
                    className="font-body font-medium px-8 py-6 text-lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Begin Session
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="mt-8">
            <div className="max-w-6xl mx-auto">
              <SessionMetrics />
            </div>
          </TabsContent>
        </Tabs>
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

export default Track;
