import { useState, useEffect } from 'react';

interface TypingAnimationProps {
  text: string;
  className?: string;
  delay?: number;
  charDelay?: number;
  showCursor?: boolean;
}

export const TypingAnimation = ({ 
  text, 
  className = '', 
  delay = 500,
  charDelay = 150,
  showCursor = true 
}: TypingAnimationProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursorState, setShowCursorState] = useState(true);

  useEffect(() => {
    // Initial delay before starting typing
    const startTimeout = setTimeout(() => {
      if (currentIndex < text.length) {
        const charTimeout = setTimeout(() => {
          setDisplayedText(prev => prev + text[currentIndex]);
          setCurrentIndex(prev => prev + 1);
        }, charDelay);
        return () => clearTimeout(charTimeout);
      } else {
        // Hide cursor after typing is complete
        setTimeout(() => setShowCursorState(false), 500);
      }
    }, currentIndex === 0 ? delay : 0);

    return () => clearTimeout(startTimeout);
  }, [currentIndex, text, charDelay, delay]);

  return (
    <span className={className}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="inline-block"
          style={{
            opacity: index < displayedText.length ? 1 : 0,
            animation: index < displayedText.length ? 'typing 0.3s ease-out' : 'none',
            animationDelay: `${index * (charDelay / 1000)}s`,
          }}
        >
          {char}
        </span>
      ))}
      {showCursor && showCursorState && (
        <span 
          className="inline-block w-1 h-[0.9em] bg-current ml-1 align-middle"
          style={{
            animation: 'cursor-blink 1s step-end infinite'
          }}
        />
      )}
    </span>
  );
};
