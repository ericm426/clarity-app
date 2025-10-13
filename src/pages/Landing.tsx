import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Eye, Brain, Target, Zap } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const Landing = () => {
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

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <Header />
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-7xl font-headline font-bold text-foreground mb-6">
            Clarity
          </h1>
          <p className="text-2xl md:text-3xl font-body text-muted-foreground mb-8">
            Professional Focus Analytics Platform
          </p>
          <p className="text-lg font-body text-muted-foreground mb-12 max-w-2xl mx-auto">
            Transform your attention into valuable intelligence. Clean dashboards, data visualization excellence, 
            and professional insights for serious students and professionals.
          </p>
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="font-body font-medium px-12 py-6 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
          >
            Get Started For Free
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <h3 className="text-xl font-headline font-semibold mb-2">Smart Eye Tracking</h3>
            <p className="text-muted-foreground font-body">
              Advanced camera-based tracking monitors your focus in real-time
            </p>
          </div>

          <div className="text-center p-6">
            <h3 className="text-xl font-headline font-semibold mb-2">Gentle Nudges</h3>
            <p className="text-muted-foreground font-body">
              Receive mindful reminders when your attention starts to wander
            </p>
          </div>

          <div className="text-center p-6">
            <h3 className="text-xl font-headline font-semibold mb-2">Focus Metrics</h3>
            <p className="text-muted-foreground font-body">
              Track your concentration levels and session performance
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-headline font-bold mb-12">How It Works</h2>
          <div className="space-y-8 text-left">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-headline font-semibold mb-2">Sign Up & Grant Camera Access</h3>
                <p className="text-muted-foreground font-body">
                  Create your free account and allow camera permissions for focus tracking
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-headline font-semibold mb-2">Start Your Focus Session</h3>
                <p className="text-muted-foreground font-body">
                  Begin tracking to help you center your attention
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-headline font-semibold mb-2">Get Alerts</h3>
                <p className="text-muted-foreground font-body">
                  Receive alerts when your attention drifts away from the screen
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="text-xl font-headline font-semibold mb-2">Review Your Progress</h3>
                <p className="text-muted-foreground font-body">
                  Track your focus metrics and improve your concentration over time
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center bg-primary/5 rounded-3xl p-12">
          <h2 className="text-4xl font-headline font-bold mb-6">Ready to Transform Your Focus?</h2>
          <p className="text-lg font-body text-muted-foreground mb-8">
          </p>
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="font-body font-medium px-12 py-6 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
          >
            Start Your Journey
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center border-t">
        <p className="text-sm font-body text-muted-foreground">
          Attention analytics. Data-driven insights.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
