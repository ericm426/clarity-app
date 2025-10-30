import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface AnimatedFeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export const AnimatedFeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  delay = 0 
}: AnimatedFeatureCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
            }, delay);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [delay]);

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-700 ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
    >
      <Card className="p-8 h-full border-border/50 hover:border-primary/20 transition-all hover:shadow-lg group">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-all group-hover:scale-110">
            <Icon className="w-8 h-8 text-foreground" />
          </div>
          <h3 className="text-xl font-headline font-medium text-foreground">
            {title}
          </h3>
          <p className="text-muted-foreground font-body leading-relaxed">
            {description}
          </p>
        </div>
      </Card>
    </div>
  );
};
