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

  const handleDashboardClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <h1 
          className="text-2xl font-headline font-bold text-foreground cursor-pointer"
          onClick={() => navigate('/')}
        >
          Clarity
        </h1>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleDashboardClick}
            variant="ghost"
            className="font-body"
          >
            Dashboard
          </Button>
          
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
