import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface NudgeAlertProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const NudgeAlert = ({ isVisible, onDismiss }: NudgeAlertProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    setShow(false);
    setTimeout(() => onDismiss(), 300);
  };

  if (!show) return null;

  return (
    <div
      className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-500 ease-zen"
      onClick={handleDismiss}
    >
      <Card className="p-6 bg-destructive/95 backdrop-blur-sm border-destructive text-destructive-foreground shadow-2xl cursor-pointer hover:scale-105 transition-transform duration-300 ease-zen">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-destructive-foreground/20 animate-pulse-glow">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-headline text-lg font-semibold mb-1">Gentle Nudge</h3>
            <p className="font-body text-sm opacity-90">
              Your focus has wandered. Take a deep breath and return to the present moment.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
