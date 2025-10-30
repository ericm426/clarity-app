import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Target, Clock, Zap, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_hours: number;
  target_sessions: number;
  target_focus_score: number;
  deadline: string;
  created_at: string;
}

export const GoalSetting = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [targetHours, setTargetHours] = useState('');
  const [targetSessions, setTargetSessions] = useState('');
  const [targetFocus, setTargetFocus] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [currentStats, setCurrentStats] = useState({
    totalHours: 0,
    totalSessions: 0,
    avgFocus: 0,
  });

  useEffect(() => {
    fetchGoalsAndStats();
  }, []);

  const fetchGoalsAndStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch sessions for stats
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id);

      if (sessions) {
        const totalHours = sessions.reduce((sum, s) => sum + s.session_duration, 0) / 3600;
        const totalSessions = sessions.length;
        const avgFocus = sessions.length > 0
          ? sessions.reduce((sum, s) => sum + (s.average_focus_level || 0), 0) / sessions.length
          : 0;

        setCurrentStats({ totalHours, totalSessions, avgFocus });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim() || !targetHours || !targetSessions || !targetFocus || !deadline) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newGoal = {
        title: newGoalTitle,
        target_hours: parseFloat(targetHours),
        target_sessions: parseInt(targetSessions),
        target_focus_score: parseFloat(targetFocus),
        deadline,
      };

      toast.success('Goal created! (Note: Backend integration pending)');
      
      // Reset form
      setNewGoalTitle('');
      setTargetHours('');
      setTargetSessions('');
      setTargetFocus('');
      setDeadline('');
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal');
    }
  };

  const calculateProgress = (target: number, current: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-headline font-bold text-foreground mb-2">
          Goal Setting
        </h2>
        <p className="text-sm text-muted-foreground">
          Set and track focus goals to build better concentration habits
        </p>
      </div>

      {/* Current Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{currentStats.totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{currentStats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-success/10">
                <Zap className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Focus</p>
                <p className="text-2xl font-bold">{Math.round(currentStats.avgFocus)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create New Goal */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Create New Goal</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(!isCreating)}
            >
              {isCreating ? 'Cancel' : <><Plus className="w-4 h-4 mr-1" /> New Goal</>}
            </Button>
          </CardTitle>
        </CardHeader>
        {isCreating && (
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Goal Title</label>
              <Input
                placeholder="e.g., Complete 20 hours of focused work"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Target Hours</label>
                <Input
                  type="number"
                  placeholder="20"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Target Sessions</label>
                <Input
                  type="number"
                  placeholder="30"
                  value={targetSessions}
                  onChange={(e) => setTargetSessions(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Target Focus Score (%)</label>
                <Input
                  type="number"
                  placeholder="85"
                  value={targetFocus}
                  onChange={(e) => setTargetFocus(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Deadline</label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleCreateGoal} className="w-full">
              Create Goal
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Sample Goals (Demo) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Sample Goals</h3>
        
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-base">Complete 20 hours of focused work</span>
              <span className="text-sm text-muted-foreground">Due: Next 7 days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Hours Progress</span>
                <span className="font-semibold">{currentStats.totalHours.toFixed(1)} / 20h</span>
              </div>
              <Progress value={calculateProgress(20, currentStats.totalHours)} />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Focus Score</span>
                <span className="font-semibold">{Math.round(currentStats.avgFocus)} / 85%</span>
              </div>
              <Progress value={calculateProgress(85, currentStats.avgFocus)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-base">Complete 30 focus sessions</span>
              <span className="text-sm text-muted-foreground">Due: End of month</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Sessions Progress</span>
                <span className="font-semibold">{currentStats.totalSessions} / 30</span>
              </div>
              <Progress value={calculateProgress(30, currentStats.totalSessions)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};