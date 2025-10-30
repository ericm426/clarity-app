import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Eye, Brain, Target, Zap, ChevronDown } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { TypingAnimation } from '@/components/TypingAnimation';

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
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section - Full viewport height */}
      <section className="min-h-screen flex flex-col items-center justify-center relative">
        <div className="text-center">
          <h1 className="text-[6rem] md:text-[7rem] lg:text-[8rem] font-headline font-bold tracking-tight text-foreground leading-none">
            <TypingAnimation 
              text="Clarity" 
              delay={300}
              charDelay={120}
              showCursor={true}
            />
          </h1>
          <p className="text-lg md:text-xl font-body text-muted-foreground tracking-wide uppercase mt-8 opacity-0 animate-[fade-in_0.6s_ease-out_1.5s_forwards]">
            Professional Focus Analytics
          </p>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-0 animate-[fade-in_0.6s_ease-out_2s_forwards]">
          <ChevronDown className="w-8 h-8 text-muted-foreground animate-bounce" />
        </div>
      </section>

      {/* About Section */}
      <section className="container mx-auto px-6 pt-8 pb-32 max-w-4xl">
        <div className="space-y-8">
        <h2 className="text-4xl md:text-5xl font-headline font-semibold text-foreground text-center mb-16">
          Transform Your Attention
        </h2>
          <p className="text-xl md:text-2xl font-body text-muted-foreground leading-relaxed text-center">
            Clarity turns your focus into valuable intelligence. Through sophisticated tracking 
            and elegant data visualization, gain professional insights that matter.
          </p>
          <div className="flex justify-center pt-8">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="font-body font-medium px-12 py-6 text-base bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 py-32">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-3 gap-16">
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-headline font-medium text-foreground">Intelligent Tracking</h3>
              <p className="text-muted-foreground font-body leading-relaxed">
                Advanced camera-based monitoring captures your attention patterns with precision
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-headline font-medium text-foreground">Mindful Alerts</h3>
              <p className="text-muted-foreground font-body leading-relaxed">
                Subtle notifications guide you back when focus begins to drift
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center">
                  <Target className="w-6 h-6 text-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-headline font-medium text-foreground">Elegant Analytics</h3>
              <p className="text-muted-foreground font-body leading-relaxed">
                Clean, sophisticated dashboards reveal your productivity insights
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-32 max-w-4xl">
        <h2 className="text-4xl md:text-5xl font-headline font-semibold text-foreground text-center mb-20">
          How It Works
        </h2>
        <div className="space-y-16">
          <div className="flex gap-8 items-start">
            <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-foreground flex items-center justify-center">
              <span className="text-2xl font-headline font-semibold">1</span>
            </div>
            <div className="pt-3">
              <h3 className="text-2xl font-headline font-medium mb-3 text-foreground">Create Account</h3>
              <p className="text-muted-foreground font-body text-lg leading-relaxed">
                Sign up and grant camera access for intelligent focus tracking
              </p>
            </div>
          </div>

          <div className="flex gap-8 items-start">
            <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-foreground flex items-center justify-center">
              <span className="text-2xl font-headline font-semibold">2</span>
            </div>
            <div className="pt-3">
              <h3 className="text-2xl font-headline font-medium mb-3 text-foreground">Begin Session</h3>
              <p className="text-muted-foreground font-body text-lg leading-relaxed">
                Start tracking and let Clarity monitor your attention patterns
              </p>
            </div>
          </div>

          <div className="flex gap-8 items-start">
            <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-foreground flex items-center justify-center">
              <span className="text-2xl font-headline font-semibold">3</span>
            </div>
            <div className="pt-3">
              <h3 className="text-2xl font-headline font-medium mb-3 text-foreground">Stay Focused</h3>
              <p className="text-muted-foreground font-body text-lg leading-relaxed">
                Receive gentle alerts when your attention begins to wander
              </p>
            </div>
          </div>

          <div className="flex gap-8 items-start">
            <div className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-foreground flex items-center justify-center">
              <span className="text-2xl font-headline font-semibold">4</span>
            </div>
            <div className="pt-3">
              <h3 className="text-2xl font-headline font-medium mb-3 text-foreground">Analyze Progress</h3>
              <p className="text-muted-foreground font-body text-lg leading-relaxed">
                Review elegant visualizations of your productivity and growth
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-foreground text-background py-32">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <h2 className="text-4xl md:text-5xl font-headline font-semibold mb-8">
            Begin Your Journey
          </h2>
          <p className="text-lg md:text-xl text-background/80 font-body mb-12 leading-relaxed">
            Experience the elegance of purposeful productivity
          </p>
          <Button
            onClick={handleGetStarted}
            size="lg"
            variant="outline"
            className="font-body font-medium px-12 py-6 text-base bg-background text-foreground hover:bg-background/90 border-background transition-all"
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 text-center border-t border-border/50">
        <p className="text-sm font-body text-muted-foreground tracking-wide">
          Clarity — Attention Analytics
        </p>
      </footer>
    </div>
  );
};

export default Landing;
