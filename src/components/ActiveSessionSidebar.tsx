import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Square, Coffee, Play } from 'lucide-react';

interface ActiveSessionSidebarProps {
  sessionDuration: number;
  focusLevel: number;
  nudgeCount: number;
  focusHistory: number[];
  isPaused: boolean;
  onEndSession: () => void;
  onTakeBreak: () => void;
}

export const ActiveSessionSidebar = ({
  sessionDuration,
  focusLevel,
  nudgeCount,
  focusHistory,
  isPaused,
  onEndSession,
  onTakeBreak
}: ActiveSessionSidebarProps) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get last 30 data points for the graph (last 30 seconds)
  const graphData = focusHistory.slice(-30).map((value, index) => ({
    index,
    focus: value
  }));

  const avgDistractions = 3.2; // Platform average

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="border-b border-border pb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-body mb-2">
          Current Session
        </p>
      </div>

      {/* Session Time */}
      <div>
        <p className="text-sm text-muted-foreground font-body mb-2">Time</p>
        <p className="text-4xl font-mono font-bold text-foreground">
          {formatTime(sessionDuration)}
        </p>
      </div>

      {/* Focus Score */}
      <div>
        <p className="text-sm text-muted-foreground font-body mb-2">Focus score</p>
        <p className="text-4xl font-mono font-bold text-primary">
          {focusLevel}%
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
            {nudgeCount}
          </p>
        </Card>
        <Card className="p-4 bg-muted/30 border-border">
          <p className="text-xs text-muted-foreground font-body mb-1">Avg per session</p>
          <p className="text-2xl font-mono font-bold text-muted-foreground">
            {avgDistractions}
          </p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3 pt-4 border-t border-border">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-body mb-3">
          Quick Actions
        </p>
        <Button
          onClick={onEndSession}
          variant="outline"
          className="w-full font-body font-medium justify-start"
        >
          <Square className="w-4 h-4 mr-2" />
          End session
        </Button>
        <Button
          onClick={onTakeBreak}
          variant="outline"
          className="w-full font-body font-medium justify-start"
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4 mr-2" />
              Resume
            </>
          ) : (
            <>
              <Coffee className="w-4 h-4 mr-2" />
              Take break
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
