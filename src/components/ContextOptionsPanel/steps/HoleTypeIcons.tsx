import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Through Hole Icon - Side cross-section view showing straight cylindrical hole
 */
export const ThroughHoleIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Material block - left side */}
    <path d="M4 8 L18 8 L18 40 L4 40 Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" />
    {/* Material block - right side */}
    <path d="M30 8 L44 8 L44 40 L30 40 Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" />
    
    {/* Through hole walls */}
    <line x1="18" y1="8" x2="18" y2="40" stroke="currentColor" strokeWidth="1" />
    <line x1="30" y1="8" x2="30" y2="40" stroke="currentColor" strokeWidth="1" />
    
    {/* Center line */}
    <line x1="24" y1="4" x2="24" y2="44" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
  </svg>
);

/**
 * Counter Sink Icon - Side cross-section view showing conical V-chamfer at top
 */
export const CounterSinkIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Material block - left side with countersink cutout */}
    <path d="M4 8 L8 8 L18 18 L18 40 L4 40 Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" />
    {/* Material block - right side with countersink cutout */}
    <path d="M40 8 L44 8 L44 40 L30 40 L30 18 Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" />
    
    {/* Countersink angled walls */}
    <line x1="8" y1="8" x2="18" y2="18" stroke="currentColor" strokeWidth="1" />
    <line x1="40" y1="8" x2="30" y2="18" stroke="currentColor" strokeWidth="1" />
    
    {/* Straight hole walls */}
    <line x1="18" y1="18" x2="18" y2="40" stroke="currentColor" strokeWidth="1" />
    <line x1="30" y1="18" x2="30" y2="40" stroke="currentColor" strokeWidth="1" />
    
    {/* Center line */}
    <line x1="24" y1="4" x2="24" y2="44" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
  </svg>
);

/**
 * Counter Bore Icon - Side cross-section view showing flat-bottomed stepped recess
 */
export const CounterBoreIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Material block - left side with counterbore cutout */}
    <path d="M4 8 L8 8 L8 18 L18 18 L18 40 L4 40 Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" />
    {/* Material block - right side with counterbore cutout */}
    <path d="M40 8 L44 8 L44 40 L30 40 L30 18 L40 18 Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" />
    
    {/* Counterbore outer walls */}
    <line x1="8" y1="8" x2="8" y2="18" stroke="currentColor" strokeWidth="1" />
    <line x1="40" y1="8" x2="40" y2="18" stroke="currentColor" strokeWidth="1" />
    
    {/* Counterbore flat shelf */}
    <line x1="8" y1="18" x2="18" y2="18" stroke="currentColor" strokeWidth="1" />
    <line x1="30" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="1" />
    
    {/* Through hole walls */}
    <line x1="18" y1="18" x2="18" y2="40" stroke="currentColor" strokeWidth="1" />
    <line x1="30" y1="18" x2="30" y2="40" stroke="currentColor" strokeWidth="1" />
    
    {/* Center line */}
    <line x1="24" y1="4" x2="24" y2="44" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
  </svg>
);

export default { ThroughHoleIcon, CounterSinkIcon, CounterBoreIcon };
