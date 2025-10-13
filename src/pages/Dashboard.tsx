import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { Profile } from '@/components/Profile';
import { FindFriends } from '@/components/FindFriends';
import { FriendProfile } from '@/components/FriendProfile';
import { 
  ArrowUp, 
  ArrowDown, 
  Play,
  TrendingUp,
  Clock,
  Zap
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { format, subDays, startOfDay, parseISO } from 'date-fns';

interface Session {
  id: string;
  session_duration: number;
  nudge_count: number;
  average_focus_level: number;
  started_at: string;
  ended_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingFriendId, setViewingFriendId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to access dashboard');
        navigate('/auth');
        return;
      }
      fetchSessions();
    };
    checkAuth();
  }, [navigate]);

  const fetchSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sevenDaysAgo = subDays(new Date(), 7);
      
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', sevenDaysAgo.toISOString())
        .order('started_at', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const last7Days = sessions;
    const previous7Days = sessions.slice(0, Math.floor(sessions.length / 2));
    
    const totalFocusHours = last7Days.reduce((sum, s) => sum + s.session_duration, 0) / 3600;
    const avgSessionMins = last7Days.length > 0 
      ? last7Days.reduce((sum, s) => sum + s.session_duration, 0) / last7Days.length / 60 
      : 0;
    const avgFocusLevel = last7Days.length > 0
      ? last7Days.reduce((sum, s) => sum + (s.average_focus_level || 0), 0) / last7Days.length
      : 0;

    const prevTotalHours = previous7Days.reduce((sum, s) => sum + s.session_duration, 0) / 3600;
    const prevAvgMins = previous7Days.length > 0
      ? previous7Days.reduce((sum, s) => sum + s.session_duration, 0) / previous7Days.length / 60
      : 0;
    const prevAvgFocus = previous7Days.length > 0
      ? previous7Days.reduce((sum, s) => sum + (s.average_focus_level || 0), 0) / previous7Days.length
      : 0;

    const hoursChange = prevTotalHours > 0 
      ? ((totalFocusHours - prevTotalHours) / prevTotalHours * 100)
      : 0;
    const minsChange = avgSessionMins - prevAvgMins;
    const focusChange = avgFocusLevel - prevAvgFocus;

    return {
      totalFocusHours: totalFocusHours.toFixed(1),
      avgSessionMins: Math.round(avgSessionMins),
      efficiency: Math.round(avgFocusLevel),
      hoursChange,
      minsChange,
      focusChange
    };
  };

  const getDailyBreakdown = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return startOfDay(date);
    });

    return last7Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const daySessions = sessions.filter(s => {
        const sessionDate = format(parseISO(s.started_at), 'yyyy-MM-dd');
        return sessionDate === dayStr;
      });

      const totalMinutes = daySessions.reduce((sum, s) => sum + s.session_duration, 0) / 60;
      const avgFocus = daySessions.length > 0
        ? daySessions.reduce((sum, s) => sum + (s.average_focus_level || 0), 0) / daySessions.length
        : 0;

      return {
        date: format(day, 'EEE'),
        minutes: Math.round(totalMinutes),
        focus: Math.round(avgFocus),
        sessions: daySessions.length
      };
    });
  };

  const getHourlyHeatmap = () => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourSessions = sessions.filter(s => {
        const sessionHour = parseISO(s.started_at).getHours();
        return sessionHour === hour;
      });

      const intensity = hourSessions.length;
      const avgFocus = hourSessions.length > 0
        ? hourSessions.reduce((sum, s) => sum + (s.average_focus_level || 0), 0) / hourSessions.length
        : 0;

      return { hour, intensity, focus: Math.round(avgFocus) };
    });

    return hourlyData;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container mx-auto px-6 py-8 flex-1">
          <p className="text-center text-muted-foreground">Loading dashboard...</p>
        </main>
      </div>
    );
  }

  const stats = calculateStats();
  const dailyData = getDailyBreakdown();
  const hourlyData = getHourlyHeatmap();

  if (viewingFriendId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container mx-auto px-6 py-8 flex-1 max-w-7xl">
          <FriendProfile userId={viewingFriendId} onBack={() => setViewingFriendId(null)} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="container mx-auto px-6 py-8 flex-1 max-w-7xl">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="friends">Find Friends</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-headline font-bold text-foreground mb-2">
                Attention Metrics
              </h1>
              <p className="text-sm font-body text-muted-foreground uppercase tracking-wide">
                Last 7 Days
              </p>
            </div>

        {/* 3-Column Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-body mb-1">
                  Total Focus
                </p>
                <p className="text-4xl font-headline font-bold text-foreground">
                  {stats.totalFocusHours}h
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {stats.hoursChange >= 0 ? (
                <ArrowUp className="w-4 h-4 text-success" />
              ) : (
                <ArrowDown className="w-4 h-4 text-destructive" />
              )}
              <span className={stats.hoursChange >= 0 ? 'text-success' : 'text-destructive'}>
                {Math.abs(Math.round(stats.hoursChange))}%
              </span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          </Card>

          <Card className="p-6 border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-body mb-1">
                  Avg Session
                </p>
                <p className="text-4xl font-headline font-bold text-foreground">
                  {stats.avgSessionMins}m
                </p>
              </div>
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {stats.minsChange >= 0 ? (
                <ArrowUp className="w-4 h-4 text-success" />
              ) : (
                <ArrowDown className="w-4 h-4 text-destructive" />
              )}
              <span className={stats.minsChange >= 0 ? 'text-success' : 'text-destructive'}>
                {Math.abs(Math.round(stats.minsChange))} min
              </span>
              <span className="text-muted-foreground">change</span>
            </div>
          </Card>

          <Card className="p-6 border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-body mb-1">
                  Efficiency
                </p>
                <p className="text-4xl font-headline font-bold text-foreground">
                  {stats.efficiency}%
                </p>
              </div>
              <div className="p-2 rounded-lg bg-success/10">
                <Zap className="w-5 h-5 text-success" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {stats.focusChange >= 0 ? (
                <ArrowUp className="w-4 h-4 text-success" />
              ) : (
                <ArrowDown className="w-4 h-4 text-destructive" />
              )}
              <span className={stats.focusChange >= 0 ? 'text-success' : 'text-destructive'}>
                {Math.abs(Math.round(stats.focusChange))} pts
              </span>
              <span className="text-muted-foreground">improvement</span>
            </div>
          </Card>
        </div>

        {/* Daily Breakdown Graph */}
        <Card className="p-6 mb-8 border-border">
          <h2 className="text-lg font-headline font-semibold mb-6 text-foreground">
            Daily Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorMinutes" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '13px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '13px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="minutes" 
                stroke="hsl(var(--primary))" 
                fill="url(#colorMinutes)"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="focus" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--accent))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Heatmap */}
        <Card className="p-6 mb-8 border-border">
          <h2 className="text-lg font-headline font-semibold mb-6 text-foreground">
            Focus Patterns by Hour
          </h2>
          <div className="grid grid-cols-12 gap-2">
            {hourlyData.map(({ hour, intensity }) => {
              const maxIntensity = Math.max(...hourlyData.map(d => d.intensity));
              const opacity = maxIntensity > 0 ? intensity / maxIntensity : 0;
              
              return (
                <div key={hour} className="flex flex-col items-center gap-1">
                  <div 
                    className="w-full aspect-square rounded transition-all hover:scale-110"
                    style={{
                      backgroundColor: `hsl(var(--primary) / ${opacity})`,
                      border: opacity > 0 ? 'none' : '1px solid hsl(var(--border))'
                    }}
                    title={`${hour}:00 - ${intensity} sessions`}
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {hour}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Peer Comparison */}
        <Card className="p-6 mb-8 border-border bg-muted/30">
          <h2 className="text-lg font-headline font-semibold mb-4 text-foreground">
            Performance Benchmark
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-body text-muted-foreground">Your avg focus</span>
                <span className="text-sm font-mono font-semibold text-foreground">
                  {stats.efficiency}%
                </span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div 
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${stats.efficiency}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-body text-muted-foreground">Platform average</span>
                <span className="text-sm font-mono font-semibold text-foreground">
                  73%
                </span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div 
                  className="bg-muted-foreground rounded-full h-2 transition-all"
                  style={{ width: '73%' }}
                />
              </div>
            </div>
          </div>
        </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => navigate('/track')}
                size="lg"
                className="font-body font-medium px-6"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <Profile />
          </TabsContent>

          <TabsContent value="friends">
            <FindFriends onViewProfile={setViewingFriendId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
