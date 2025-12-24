/**
 * RotationControl - Reusable 3D rotation input control
 * 
 * Used for editing rotation values in degrees with consistent styling.
 */

import React, { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCw, RotateCcw } from 'lucide-react';
import { NumberInput } from './number-input';

export interface Rotation3D {
  x: number;
  y: number;
  z: number;
}

export interface RotationControlProps {
  /** Current rotation values in degrees */
  rotation: Rotation3D;
  /** Rotation change handler */
  onChange: (axis: 'x' | 'y' | 'z', degrees: number) => void;
  /** Reset rotation handler */
  onReset?: () => void;
  /** Step increment for inputs */
  step?: number;
  /** Decimal places for display */
  decimals?: number;
  /** Which axes to show (default: all) */
  axes?: ('x' | 'y' | 'z')[];
}

/**
 * 3D rotation control with optional reset button
 */
export const RotationControl: React.FC<RotationControlProps> = ({
  rotation,
  onChange,
  onReset,
  step = 5,
  decimals = 1,
  axes = ['x', 'y', 'z'],
}) => {
  const handleChange = useCallback(
    (axis: 'x' | 'y' | 'z') => (value: number) => {
      onChange(axis, value);
    },
    [onChange]
  );

  const columns = axes.length === 1 ? 1 : axes.length === 2 ? 2 : 3;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[8px] font-tech text-muted-foreground flex items-center gap-1">
          <RotateCw className="w-2.5 h-2.5" />
          Rotation (°)
        </Label>
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-5 px-1.5 text-[8px]"
            title="Reset rotation"
            aria-label="Reset rotation"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </Button>
        )}
      </div>
      <div className={`grid gap-2 ${columns === 1 ? '' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {axes.includes('x') && (
          <NumberInput
            value={rotation.x}
            onChange={handleChange('x')}
            label="X"
            axis="x"
            step={step}
            decimals={decimals}
          />
        )}
        {axes.includes('y') && (
          <NumberInput
            value={rotation.y}
            onChange={handleChange('y')}
            label="Y"
            axis="y"
            step={step}
            decimals={decimals}
          />
        )}
        {axes.includes('z') && (
          <NumberInput
            value={rotation.z}
            onChange={handleChange('z')}
            label="Z"
            axis="z"
            step={step}
            decimals={decimals}
          />
        )}
      </div>
    </div>
  );
};

export default RotationControl;
