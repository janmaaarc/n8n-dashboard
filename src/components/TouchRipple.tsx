import React, { useState, useCallback } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface TouchRippleProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  color?: 'light' | 'dark' | 'primary';
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
}

export const TouchRipple: React.FC<TouchRippleProps> = ({
  children,
  className = '',
  disabled = false,
  color = 'light',
  onClick,
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [isPressed, setIsPressed] = useState(false);

  const colorClasses = {
    light: 'bg-white/30',
    dark: 'bg-black/10',
    primary: 'bg-indigo-500/30',
  };

  const createRipple = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;

      const element = e.currentTarget as HTMLElement;
      const rect = element.getBoundingClientRect();

      let x: number, y: number;

      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }

      const size = Math.max(rect.width, rect.height) * 2;
      const id = Date.now();

      setRipples((prev) => [...prev, { id, x, y, size }]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
      }, 600);
    },
    [disabled]
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      setIsPressed(true);
      createRipple(e);
    },
    [createRipple]
  );

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!disabled && onClick) {
        onClick(e);
      }
    },
    [disabled, onClick]
  );

  return (
    <div
      className={`relative overflow-hidden select-none transition-transform duration-150 ${
        isPressed && !disabled ? 'scale-[0.98]' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
      onClick={handleClick}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className={`absolute rounded-full pointer-events-none animate-ripple ${colorClasses[color]}`}
          style={{
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
    </div>
  );
};

// Hook for touch feedback
export const useTouchFeedback = () => {
  const [isPressed, setIsPressed] = useState(false);

  const touchProps = {
    onTouchStart: () => setIsPressed(true),
    onTouchEnd: () => setIsPressed(false),
    onTouchCancel: () => setIsPressed(false),
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onMouseLeave: () => setIsPressed(false),
  };

  return { isPressed, touchProps };
};

// Pressable wrapper component with scale animation
interface PressableProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  scale?: number;
}

export const Pressable: React.FC<PressableProps> = ({
  children,
  className = '',
  disabled = false,
  onClick,
  scale = 0.97,
}) => {
  const { isPressed, touchProps } = useTouchFeedback();

  return (
    <div
      {...touchProps}
      onClick={disabled ? undefined : onClick}
      className={`transition-transform duration-150 ease-out ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]'
      } ${className}`}
      style={{
        transform: isPressed && !disabled ? `scale(${scale})` : 'scale(1)',
      }}
    >
      {children}
    </div>
  );
};
