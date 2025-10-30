import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Eye, Brain, Target, Zap, ChevronDown, BarChart3, Users, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { TypingAnimation } from '@/components/TypingAnimation';
import { AnimatedFeatureCard } from '@/components/AnimatedFeatureCard';
import { AnimatedShowcase } from '@/components/AnimatedShowcase';

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
      
      {/* Hero Section - 2/3 viewport height */}
      <section className="h-[65vh] flex flex-col items-center justify-center relative">
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
      <section className="container mx-auto px-6 pt-6 pb-24 max-w-4xl">
        <div className="space-y-8">
        <h2 className="text-4xl md:text-5xl font-headline font-semibold text-foreground text-center mb-16">
          Transform Your Attention
        </h2>
          <p className="text-xl md:text-2xl font-body text-muted-foreground leading-relaxed text-center">
            Through sophisticated tracking and elegant data visualization, 
            gain insights that matter for your productivity habits.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 py-32">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-headline font-semibold text-foreground mb-6">
              Powerful Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to understand and improve your focus
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <AnimatedFeatureCard
              icon={Eye}
              title="Intelligent Tracking"
              description="Advanced camera-based monitoring captures your attention patterns with precision"
              delay={0}
            />
            <AnimatedFeatureCard
              icon={Brain}
              title="Mindful Alerts"
              description="Subtle notifications guide you back when focus begins to drift"
              delay={150}
            />
            <AnimatedFeatureCard
              icon={BarChart3}
              title="Elegant Analytics"
              description="Clean, sophisticated dashboards reveal your productivity insights"
              delay={300}
            />
            <AnimatedFeatureCard
              icon={Users}
              title="Competition"
              description="Compare your focus metrics with friends on the leaderboard"
              delay={0}
            />
            <AnimatedFeatureCard
              icon={Sparkles}
              title="Smart Insights"
              description="Recommendations help you optimize your work patterns"
              delay={150}
            />
            <AnimatedFeatureCard
              icon={Target}
              title="Goal Setting"
              description="Set and track focus goals to build better concentration habits"
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* Animated Showcase */}
      <section className="container mx-auto px-6 py-32 max-w-6xl">
        <AnimatedShowcase />
      </section>

      {/* CTA Section */}
      <section className="bg-background text-foreground py-32">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <h2 className="text-4xl md:text-5xl font-headline font-semibold mb-8">
            Experience Clarity
          </h2>
          <Button
            onClick={handleGetStarted}
            size="lg"
            variant="outline"
            className="font-body font-medium px-12 py-6 text-base bg-background text-foreground hover:bg-foreground/90 border-background transition-all"
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
