import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Profile {
  display_name: string;
  avatar_url: string;
  bio: string;
}

interface Session {
  id: string;
  session_duration: number;
  nudge_count: number;
  average_focus_level: number;
  started_at: string;
  ended_at: string;
}

export const FriendProfile = ({ userId, onBack }: { userId: string; onBack: () => void }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriendData();
  }, [userId]);

  const fetchFriendData = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: sessionsData } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', sevenDaysAgo.toISOString())
        .order('started_at', { ascending: true });

      if (sessionsData) {
        setSessions(sessionsData);
      }
    } catch (error) {
      console.error('Error fetching friend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (sessions.length === 0) return null;

    const totalMinutes = sessions.reduce((sum, s) => sum + s.session_duration, 0) / 60;
    const avgDuration = totalMinutes / sessions.length;
    const avgFocus = sessions.reduce((sum, s) => sum + (s.average_focus_level || 0), 0) / sessions.length;

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      avgSession: avgDuration.toFixed(0),
      avgFocus: avgFocus.toFixed(0),
    };
  };

  const getDailyBreakdown = () => {
    const dailyData: { [key: string]: { minutes: number; focus: number; count: number } } = {};

    sessions.forEach((session) => {
      const date = new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dailyData[date]) {
        dailyData[date] = { minutes: 0, focus: 0, count: 0 };
      }
      dailyData[date].minutes += session.session_duration / 60;
      dailyData[date].focus += session.average_focus_level || 0;
      dailyData[date].count += 1;
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      minutes: Math.round(data.minutes),
      focus: Math.round(data.focus / data.count),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const stats = calculateStats();
  const dailyData = getDailyBreakdown();

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Friends
      </Button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>{profile?.display_name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{profile?.display_name}</h2>
              {profile?.bio && <p className="text-muted-foreground mt-1">{profile.bio}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Focus Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalHours}h</div>
                <p className="text-sm text-muted-foreground mt-1">Last 7 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Session</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.avgSession}m</div>
                <p className="text-sm text-muted-foreground mt-1">Per session</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Focus Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.avgFocus}%</div>
                <p className="text-sm text-muted-foreground mt-1">Average</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="minutes" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No activity data available yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
