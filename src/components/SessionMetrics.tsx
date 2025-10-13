import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface Session {
  id: string;
  session_duration: number;
  nudge_count: number;
  started_at: string;
  ended_at: string;
}

export const SessionMetrics = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeeklyData = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return daysOfWeek.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const daySessions = sessions.filter(session => {
        const sessionDate = format(parseISO(session.started_at), 'yyyy-MM-dd');
        return sessionDate === dayStr;
      });

      const totalDuration = daySessions.reduce((sum, s) => sum + s.session_duration, 0);
      const totalNudges = daySessions.reduce((sum, s) => sum + s.nudge_count, 0);

      return {
        day: format(day, 'EEE'),
        duration: Math.round(totalDuration / 60), // Convert to minutes
        nudges: totalNudges,
        sessions: daySessions.length,
      };
    });
  };

  const getDailySessionsData = () => {
    const sessionsPerDay: { [key: string]: { nudges: number; duration: number; count: number } } = {};

    sessions.forEach(session => {
      const dateStr = format(parseISO(session.started_at), 'MMM dd');
      if (!sessionsPerDay[dateStr]) {
        sessionsPerDay[dateStr] = { nudges: 0, duration: 0, count: 0 };
      }
      sessionsPerDay[dateStr].nudges += session.nudge_count;
      sessionsPerDay[dateStr].duration += session.session_duration;
      sessionsPerDay[dateStr].count += 1;
    });

    return Object.entries(sessionsPerDay)
      .slice(0, 7)
      .reverse()
      .map(([date, data]) => ({
        date,
        nudges: data.nudges,
        duration: Math.round(data.duration / 60),
        sessions: data.count,
      }));
  };

  const weeklyData = getWeeklyData();
  const dailyData = getDailySessionsData();

  const totalSessions = sessions.length;
  const totalNudges = sessions.reduce((sum, s) => sum + s.nudge_count, 0);
  const totalDuration = sessions.reduce((sum, s) => sum + s.session_duration, 0);
  const avgNudgesPerSession = totalSessions > 0 ? (totalNudges / totalSessions).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading your metrics...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">No sessions yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Complete your first focus session to see metrics here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(totalDuration / 3600)} hours total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nudges</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNudges}</div>
            <p className="text-xs text-muted-foreground">
              {avgNudgesPerSession} avg per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalDuration / 60)} min</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(totalDuration / totalSessions / 60)} min avg session
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Overview */}
      <Card>
        <CardHeader>
          <CardTitle>This Week's Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--destructive))" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="duration" fill="hsl(var(--primary))" name="Minutes" />
              <Bar yAxisId="right" dataKey="nudges" fill="hsl(var(--destructive))" name="Nudges" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="nudges" fill="hsl(var(--destructive))" name="Nudges per Day" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
