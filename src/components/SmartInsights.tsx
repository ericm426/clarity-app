import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, Clock, Zap, Calendar } from 'lucide-react';

interface Session {
  id: string;
  session_duration: number;
  nudge_count: number;
  average_focus_level: number;
  started_at: string;
  ended_at: string;
}

interface Insight {
  title: string;
  description: string;
  icon: typeof Lightbulb;
  type: 'positive' | 'warning' | 'neutral';
}

export const SmartInsights = ({ sessions }: { sessions: Session[] }) => {
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    generateInsights();
  }, [sessions]);

  const generateInsights = () => {
    const newInsights: Insight[] = [];

    if (sessions.length === 0) {
      newInsights.push({
        title: 'Start Your Journey',
        description: 'Begin tracking your focus sessions to receive personalized insights and recommendations.',
        icon: Lightbulb,
        type: 'neutral',
      });
      setInsights(newInsights);
      return;
    }

    // Analyze peak productivity hours
    const hourlyData: { [hour: number]: number } = {};
    sessions.forEach(session => {
      const hour = new Date(session.started_at).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourlyData).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) {
      newInsights.push({
        title: 'Peak Performance Time',
        description: `You're most productive around ${peakHour[0]}:00. Schedule your most important tasks during this time.`,
        icon: Clock,
        type: 'positive',
      });
    }

    // Analyze average session length
    const avgDuration = sessions.reduce((sum, s) => sum + s.session_duration, 0) / sessions.length / 60;
    if (avgDuration < 25) {
      newInsights.push({
        title: 'Extend Your Sessions',
        description: 'Your average session is shorter than the optimal 25 minutes. Try using the Pomodoro technique to build longer focus periods.',
        icon: TrendingUp,
        type: 'warning',
      });
    } else if (avgDuration > 60) {
      newInsights.push({
        title: 'Take More Breaks',
        description: 'Your sessions average over 60 minutes. Consider taking short breaks every 25-50 minutes to maintain peak performance.',
        icon: Zap,
        type: 'warning',
      });
    }

    // Analyze focus consistency
    const avgFocus = sessions.reduce((sum, s) => sum + (s.average_focus_level || 0), 0) / sessions.length;
    if (avgFocus > 85) {
      newInsights.push({
        title: 'Excellent Focus Level',
        description: `Your average focus score of ${Math.round(avgFocus)}% is outstanding! Keep up the great work.`,
        icon: Zap,
        type: 'positive',
      });
    } else if (avgFocus < 60) {
      newInsights.push({
        title: 'Minimize Distractions',
        description: 'Your focus score could improve. Try turning off notifications, using website blockers, or finding a quieter workspace.',
        icon: Zap,
        type: 'warning',
      });
    }

    // Analyze weekly consistency
    const daysActive = new Set(sessions.map(s => new Date(s.started_at).toDateString())).size;
    if (daysActive < 3) {
      newInsights.push({
        title: 'Build Consistency',
        description: 'Try to track focus sessions at least 4-5 days per week to build a sustainable productivity habit.',
        icon: Calendar,
        type: 'warning',
      });
    } else if (daysActive >= 5) {
      newInsights.push({
        title: 'Great Consistency',
        description: `You've been active ${daysActive} days this week! Consistent practice is key to building better focus habits.`,
        icon: Calendar,
        type: 'positive',
      });
    }

    // Analyze distraction patterns
    const avgDistractions = sessions.reduce((sum, s) => sum + (s.nudge_count || 0), 0) / sessions.length;
    if (avgDistractions > 5) {
      newInsights.push({
        title: 'Reduce Interruptions',
        description: 'You average more than 5 distractions per session. Consider using "Do Not Disturb" mode and communicating your focus time to others.',
        icon: Lightbulb,
        type: 'warning',
      });
    } else if (avgDistractions < 2) {
      newInsights.push({
        title: 'Distraction-Free Master',
        description: 'Impressive! You maintain excellent focus with minimal distractions. Share your techniques with friends!',
        icon: Lightbulb,
        type: 'positive',
      });
    }

    setInsights(newInsights);
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      default:
        return 'text-primary';
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-success/10';
      case 'warning':
        return 'bg-warning/10';
      default:
        return 'bg-primary/10';
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-headline font-bold text-foreground mb-2">
          Smart Insights
        </h2>
        <p className="text-sm text-muted-foreground">
          AI-powered recommendations to optimize your work patterns
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((insight, index) => (
          <Card key={index} className="border-border">
            <CardHeader>
              <CardTitle className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getBgColor(insight.type)}`}>
                  <insight.icon className={`w-5 h-5 ${getIconColor(insight.type)}`} />
                </div>
                <span className="text-lg font-semibold">{insight.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{insight.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};