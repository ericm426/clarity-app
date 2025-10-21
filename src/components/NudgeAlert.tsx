import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export type AlertSeverity = 'gentle' | 'standard' | 'strong';

interface NudgeAlertProps {
  isVisible: boolean;
  onDismiss: () => void;
  severity?: AlertSeverity;
}

export const NudgeAlert = ({ isVisible, onDismiss, severity = 'standard' }: NudgeAlertProps) => {
  const [show, setShow] = useState(false);

  // Configuration based on severity
  const severityConfig = {
    gentle: {
      icon: Bell,
      title: 'Gentle Reminder',
      message: 'Your attention seems to be drifting. Take a moment to refocus.',
      bgColor: 'bg-yellow-500/95',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-50',
      duration: 4000,
    },
    standard: {
      icon: AlertTriangle,
      title: 'Focus Alert',
      message: 'Your focus has wandered. Take a deep breath and return to the present moment.',
      bgColor: 'bg-orange-500/95',
      borderColor: 'border-orange-500',
      textColor: 'text-orange-50',
      duration: 5000,
    },
    strong: {
      icon: AlertCircle,
      title: 'Attention Required',
      message: 'No face detected or eyes closed. Consider taking a short break?',
      bgColor: 'bg-destructive/95',
      borderColor: 'border-destructive',
      textColor: 'text-destructive-foreground',
      duration: 6000,
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      // Auto-dismiss based on severity duration
      const timer = setTimeout(() => {
        handleDismiss();
      }, config.duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, config.duration]);

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
      <Card className={`p-6 ${config.bgColor} backdrop-blur-sm ${config.borderColor} ${config.textColor} shadow-2xl cursor-pointer hover:scale-105 transition-transform duration-300 ease-zen`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${severity === 'strong' ? 'bg-white/20' : 'bg-white/30'} animate-pulse-glow`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-headline text-lg font-semibold mb-1">{config.title}</h3>
            <p className="font-body text-sm opacity-90">
              {config.message}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
