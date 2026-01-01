import React, { useState, useEffect } from 'react';
import { X, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'fixture-view-nav-tooltip-dismissed';

interface NavigationTooltipProps {
  className?: string;
}

// Color constants for consistency between SVG and legend
const COLORS = {
  rotate: { fill: '#3b82f6', fillLight: 'rgba(59, 130, 246, 0.35)', border: '#2563eb' },  // Blue
  pan: { fill: '#22c55e', fillLight: 'rgba(34, 197, 94, 0.35)', border: '#16a34a' },       // Green
  zoom: { fill: '#f59e0b', fillLight: 'rgba(245, 158, 11, 0.5)', border: '#d97706' },      // Amber
};

/**
 * Mouse illustration SVG component showing navigation controls
 */
const MouseIllustration: React.FC = () => (
  <svg
    width="64"
    height="88"
    viewBox="0 0 64 88"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="flex-shrink-0"
  >
    {/* Mouse body - rounded rectangle */}
    <rect
      x="8"
      y="16"
      width="48"
      height="64"
      rx="24"
      className="fill-background"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeWidth="2"
    />
    
    {/* Left button (Rotate) - Blue */}
    <path
      d="M8 40 V36 C8 24.954 16.954 16 28 16 H32 V40 H8 Z"
      fill={COLORS.rotate.fillLight}
      stroke={COLORS.rotate.border}
      strokeWidth="2"
    />
    
    {/* Right button (Pan) - Green */}
    <path
      d="M56 40 V36 C56 24.954 47.046 16 36 16 H32 V40 H56 Z"
      fill={COLORS.pan.fillLight}
      stroke={COLORS.pan.border}
      strokeWidth="2"
    />
    
    {/* Scroll wheel well */}
    <rect
      x="27"
      y="24"
      width="10"
      height="16"
      rx="5"
      className="fill-muted/20"
    />
    
    {/* Scroll wheel - Amber */}
    <rect
      x="29"
      y="26"
      width="6"
      height="12"
      rx="3"
      fill={COLORS.zoom.fillLight}
      stroke={COLORS.zoom.border}
      strokeWidth="1.5"
    />
    
    {/* Scroll wheel notches */}
    <line x1="32" y1="29" x2="32" y2="31" stroke="white" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="32" y1="33" x2="32" y2="35" stroke="white" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * Navigation tooltip component that shows mouse controls for 3D navigation.
 * Also shows contextual next-step hints based on workflow progress.
 * Displayed at bottom-left of the 3D viewer. Can be dismissed and remembers preference.
 */
const NavigationTooltip: React.FC<NavigationTooltipProps> = ({ className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the tooltip before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // Small delay to let the 3D viewer load first
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 200);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        absolute bottom-4 left-4 z-50
        bg-popover/95 backdrop-blur-sm
        border border-border rounded-lg shadow-lg
        p-3 max-w-[280px]
        transition-all duration-200
        ${isAnimatingOut ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0 animate-in fade-in-0 slide-in-from-bottom-4'}
        ${className || ''}
      `}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 rounded-full hover:bg-muted"
        onClick={handleClose}
        aria-label="Close navigation help"
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      {/* Title */}
      <div className="flex items-center gap-1.5 mb-2 pr-6">
        <MousePointer2 className="h-4 w-4 text-primary" />
        <span className="font-tech text-sm font-medium">3D Navigation</span>
      </div>

      {/* Content */}
      <div className="flex gap-4 items-center">
        {/* Mouse illustration */}
        <MouseIllustration />

        {/* Controls legend */}
        <div className="flex flex-col gap-2.5 text-xs font-tech">
          <div className="flex items-center gap-2">
            <div 
              className="w-3.5 h-3.5 rounded-sm" 
              style={{ backgroundColor: COLORS.rotate.fillLight, border: `1.5px solid ${COLORS.rotate.border}` }} 
            />
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">Left</span> → Rotate
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div 
              className="w-3.5 h-3.5 rounded-sm" 
              style={{ backgroundColor: COLORS.pan.fillLight, border: `1.5px solid ${COLORS.pan.border}` }} 
            />
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">Right</span> → Pan
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div 
              className="w-3.5 h-3.5 rounded-full" 
              style={{ backgroundColor: COLORS.zoom.fillLight, border: `1.5px solid ${COLORS.zoom.border}` }} 
            />
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">Scroll</span> → Zoom
            </span>
          </div>
        </div>
      </div>

      {/* Dismiss hint */}
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Click × to dismiss. Won't show again.
      </p>
    </div>
  );
};

export default NavigationTooltip;
