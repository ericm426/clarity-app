import { Timer, Eye, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface FocusStatsProps {
  sessionDuration: number;
  focusLevel: number;
  nudgeCount: number;
}

export const FocusStats = ({ sessionDuration, focusLevel, nudgeCount }: FocusStatsProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFocusLevelColor = () => {
    if (focusLevel > 70) return 'text-primary';
    if (focusLevel > 40) return 'text-accent';
    return 'text-destructive';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-500 ease-zen">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Timer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-body">Session Time</p>
            <p className="text-2xl font-mono font-semibold text-foreground">
              {formatTime(sessionDuration)}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-500 ease-zen">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-accent/10">
            <Eye className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-body">Focus Level</p>
            <p className={`text-2xl font-mono font-semibold ${getFocusLevelColor()}`}>
              {focusLevel}%
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-500 ease-zen">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-destructive/10">
            <TrendingUp className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-body">Nudges</p>
            <p className="text-2xl font-mono font-semibold text-foreground">
              {nudgeCount}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
