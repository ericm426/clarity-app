import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FocusStats } from '@/components/FocusStats';
import { NudgeAlert } from '@/components/NudgeAlert';
import { CameraPreview } from '@/components/CameraPreview';
import { SessionMetrics } from '@/components/SessionMetrics';
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

          <TabsContent value="track" className="flex flex-col items-center gap-16 mt-8">
        {/* Camera Preview */}
        {isTracking && stream && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-body text-muted-foreground mb-2">Camera Preview</p>
            <CameraPreview stream={stream} />
          </div>
        )}

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
