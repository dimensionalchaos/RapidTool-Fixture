/**
 * IconButton - Reusable accessible icon button component
 * 
 * Provides consistent styling and keyboard accessibility for icon-only buttons
 * used throughout accordion panels and toolbars.
 */

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Button title/tooltip */
  title: string;
  /** Icon to render */
  icon: React.ReactNode;
  /** Visual variant */
  variant?: 'default' | 'destructive' | 'ghost';
  /** Whether the button is in active/pressed state */
  isActive?: boolean;
  /** Additional class names */
  className?: string;
  /** Whether to stop event propagation */
  stopPropagation?: boolean;
  /** Accessible label (defaults to title) */
  ariaLabel?: string;
}

const variantStyles = {
  default: 'text-foreground hover:bg-muted',
  destructive: 'text-destructive hover:text-destructive hover:bg-destructive/10',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
} as const;

/**
 * Accessible icon button with keyboard support
 */
export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  title,
  icon,
  variant = 'default',
  isActive = false,
  className,
  stopPropagation = true,
  ariaLabel,
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (stopPropagation) {
        e.stopPropagation();
        e.preventDefault();
      }
      onClick();
    },
    [onClick, stopPropagation]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (stopPropagation) {
          e.stopPropagation();
          e.preventDefault();
        }
        onClick();
      }
    },
    [onClick, stopPropagation]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'w-6 h-6 p-0 flex items-center justify-center rounded cursor-pointer transition-colors',
        variantStyles[variant],
        isActive && 'bg-muted',
        className
      )}
      title={title}
      aria-label={ariaLabel ?? title}
      aria-pressed={isActive}
    >
      {icon}
    </div>
  );
};

export default IconButton;
