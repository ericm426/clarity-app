import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleFocusMetricsClick = () => {
    if (user) {
      navigate('/track');
    } else {
      navigate('/auth');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 
            className="text-2xl font-headline font-bold text-foreground cursor-pointer"
            onClick={() => navigate('/')}
          >
            Clarity
          </h1>
          <button
            onClick={handleFocusMetricsClick}
            className="text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Focus Metrics
          </button>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Button
              onClick={handleLogout}
              variant="outline"
              className="font-body"
            >
              Log Out
            </Button>
          ) : (
            <>
              <Button
                onClick={() => navigate('/auth')}
                variant="ghost"
                className="font-body"
              >
                Log In
              </Button>
              <Button
                onClick={() => navigate('/auth')}
                className="font-body"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
