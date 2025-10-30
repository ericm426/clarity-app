import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useBlockingSession(isPaused: boolean = false) {
  const [blockingSessionId, setBlockingSessionId] = useState<string | null>(null);
  const [isBlockingActive, setIsBlockingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start a blocking session
  const startBlockingSession = useCallback(async (focusSessionId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if there's already an active session
      const { data: existingSession, error: checkError } = await supabase
        .from('active_blocking_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingSession) {
        setBlockingSessionId(existingSession.id);
        setIsBlockingActive(true);
        return existingSession.id;
      }

      // Create new blocking session
      const { data: newSession, error } = await supabase
        .from('active_blocking_sessions')
        .insert({
          user_id: user.id,
          focus_session_id: focusSessionId || null,
          is_active: true,
          is_paused: false,
          last_heartbeat: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create blocking session:', error);
        throw error;
      }

      setBlockingSessionId(newSession.id);
      setIsBlockingActive(true);
      return newSession.id;
    } catch (err: any) {
      console.error('Error starting blocking session:', err);
      setError(err.message);
      return null;
    }
  }, []);

  // Stop the blocking session
  const stopBlockingSession = useCallback(async () => {
    if (!blockingSessionId) return;

    try {
      const { error } = await supabase
        .from('active_blocking_sessions')
        .update({ is_active: false })
        .eq('id', blockingSessionId);

      if (error) throw error;

      setBlockingSessionId(null);
      setIsBlockingActive(false);
    } catch (err: any) {
      console.error('Error stopping blocking session:', err);
      setError(err.message);
    }
  }, [blockingSessionId]);

  // Send heartbeat to keep session alive
  const sendHeartbeat = useCallback(async () => {
    if (!blockingSessionId || !isBlockingActive) return;

    try {
      const { error } = await supabase
        .from('active_blocking_sessions')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('id', blockingSessionId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error sending heartbeat:', err);
      // Don't set error state for heartbeat failures as they're not critical
    }
  }, [blockingSessionId, isBlockingActive]);

  // Update pause state in database when isPaused changes
  useEffect(() => {
    const updatePauseState = async () => {
      if (!blockingSessionId || !isBlockingActive) return;

      try {
        await supabase
          .from('active_blocking_sessions')
          .update({ is_paused: isPaused })
          .eq('id', blockingSessionId);
      } catch (err: any) {
        console.error('Error updating pause state:', err);
      }
    };

    updatePauseState();
  }, [isPaused, blockingSessionId, isBlockingActive]);

  // Send heartbeat every 30 seconds (only when not paused)
  useEffect(() => {
    if (!isBlockingActive || isPaused) return;

    // Send initial heartbeat
    sendHeartbeat();

    const interval = setInterval(() => {
      sendHeartbeat();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isBlockingActive, isPaused, sendHeartbeat]);

  // Check for existing active session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: session } = await supabase
          .from('active_blocking_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (session) {
          // Check if session is stale
          const lastHeartbeat = new Date(session.last_heartbeat);
          const now = new Date();
          const minutesSinceHeartbeat = (now.getTime() - lastHeartbeat.getTime()) / 1000 / 60;

          if (minutesSinceHeartbeat < 5) {
            setBlockingSessionId(session.id);
            setIsBlockingActive(true);
          } else {
            // Session is stale, deactivate it
            await supabase
              .from('active_blocking_sessions')
              .update({ is_active: false })
              .eq('id', session.id);
          }
        }
      } catch (err) {
        console.error('Error checking existing session:', err);
      }
    };

    checkExistingSession();
  }, []);

  return {
    isBlockingActive,
    blockingSessionId,
    startBlockingSession,
    stopBlockingSession,
    sendHeartbeat,
    error,
  };
}
