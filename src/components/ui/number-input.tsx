/**
 * NumberInput - Specialized numeric input with axis color support
 * 
 * Used throughout transform/position controls with consistent styling.
 */

import React, { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type AxisColor = 'x' | 'y' | 'z' | 'none';

const AXIS_COLORS: Record<AxisColor, string> = {
  x: 'text-red-500',
  y: 'text-green-500',
  z: 'text-blue-500',
  none: 'text-muted-foreground',
};

export interface NumberInputProps {
  /** Current value */
  value: number;
  /** Change handler */
  onChange: (value: number) => void;
  /** Input label */
  label?: string;
  /** Axis for color styling */
  axis?: AxisColor;
  /** Decimal places for display */
  decimals?: number;
  /** Step increment */
  step?: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Additional input class names */
  className?: string;
  /** Unit suffix to display */
  unit?: string;
}

/**
 * Numeric input with axis-aware color styling
 */
export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  label,
  axis = 'none',
  decimals = 1,
  step = 0.5,
  min,
  max,
  className,
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(e.target.value);
      const numValue = Number.isNaN(parsed) ? 0 : parsed;
      onChange(numValue);
    },
    [onChange]
  );

  const displayValue = value.toFixed(decimals);

  return (
    <div className="space-y-1">
      {label && (
        <Label className={cn('text-[8px] font-mono', AXIS_COLORS[axis])}>
          {label}
        </Label>
      )}
      <Input
        type="number"
        value={displayValue}
        onChange={handleChange}
        className={cn('h-6 !text-[10px] font-mono', className)}
        step={step}
        min={min}
        max={max}
      />
    </div>
  );
};

export default NumberInput;
