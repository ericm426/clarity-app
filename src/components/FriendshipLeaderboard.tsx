import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string;
  total_hours: number;
  avg_focus: number;
  total_sessions: number;
  rank: number;
}

export const FriendshipLeaderboard = ({ onViewProfile }: { onViewProfile: (userId: string) => void }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe]);

  const fetchLeaderboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      // Get all friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!friendships) return;

      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );
      
      // Include current user
      const allUserIds = [...friendIds, user.id];

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      if (timeframe === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeframe === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else {
        startDate = new Date(0); // All time
      }

      // Fetch sessions for all users
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('user_id, session_duration, average_focus_level')
        .in('user_id', allUserIds)
        .gte('started_at', startDate.toISOString());

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', allUserIds);

      if (!sessions || !profiles) return;

      // Calculate stats per user
      const userStats = allUserIds.map(userId => {
        const userSessions = sessions.filter(s => s.user_id === userId);
        const profile = profiles.find(p => p.user_id === userId);
        
        const totalHours = userSessions.reduce((sum, s) => sum + s.session_duration, 0) / 3600;
        const avgFocus = userSessions.length > 0
          ? userSessions.reduce((sum, s) => sum + (s.average_focus_level || 0), 0) / userSessions.length
          : 0;

        return {
          user_id: userId,
          display_name: profile?.display_name || 'Unknown User',
          avatar_url: profile?.avatar_url || '',
          total_hours: totalHours,
          avg_focus: avgFocus,
          total_sessions: userSessions.length,
          score: totalHours * avgFocus, // Combined score
        };
      });

      // Sort by score and assign ranks
      const sorted = userStats
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      setLeaderboard(sorted);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-warning" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Award className="w-5 h-5 text-accent" />;
    return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>;
  };

  const getTimeframeLabel = () => {
    if (timeframe === 'week') return 'This Week';
    if (timeframe === 'month') return 'This Month';
    return 'All Time';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading leaderboard...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Friends Leaderboard
          </CardTitle>
          <Badge variant="outline">{getTimeframeLabel()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {leaderboard.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No activity data yet. Start a focus session to appear on the leaderboard!
          </p>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry) => {
              const isCurrentUser = entry.user_id === currentUserId;
              
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer hover:bg-accent/50 ${
                    isCurrentUser ? 'bg-primary/5 border-primary' : 'hover:border-primary/20'
                  }`}
                  onClick={() => onViewProfile(entry.user_id)}
                >
                  <div className="flex items-center justify-center w-10">
                    {getRankIcon(entry.rank)}
                  </div>

                  <Avatar className="h-12 w-12">
                    <AvatarImage src={entry.avatar_url} />
                    <AvatarFallback>{entry.display_name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">
                        {entry.display_name}
                      </p>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {entry.total_hours.toFixed(1)}h
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {Math.round(entry.avg_focus)}% focus
                      </span>
                      <span className="text-xs">
                        {entry.total_sessions} sessions
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      {Math.round(entry.avg_focus)}
                    </p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
