/**
 * PositionControl - Reusable 3D position input control
 * 
 * Used for editing X/Y/Z coordinates with CAD-style axis mapping.
 */

import React, { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Crosshair, RotateCcw, ArrowDownToLine } from 'lucide-react';
import { NumberInput } from './number-input';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface PositionControlProps {
  /** Current position values */
  position: Position3D;
  /** Position change handler */
  onChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  /** Reset position handler */
  onReset?: () => void;
  /** Set to baseplate handler */
  onSetToBaseplate?: () => void;
  /** Whether baseplate button should be shown */
  showBaseplateButton?: boolean;
  /** Step increment for inputs */
  step?: number;
  /** Decimal places for display */
  decimals?: number;
  /** Number of columns (2 or 3) */
  columns?: 2 | 3;
}

/**
 * 3D position control with optional reset and baseplate buttons
 */
export const PositionControl: React.FC<PositionControlProps> = ({
  position,
  onChange,
  onReset,
  onSetToBaseplate,
  showBaseplateButton = false,
  step = 0.5,
  decimals = 1,
  columns = 3,
}) => {
  const handleChange = useCallback(
    (axis: 'x' | 'y' | 'z') => (value: number) => {
      onChange(axis, value);
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[8px] font-tech text-muted-foreground flex items-center gap-1">
          <Crosshair className="w-2.5 h-2.5" />
          Position (mm)
        </Label>
        <div className="flex items-center gap-1">
          {showBaseplateButton && onSetToBaseplate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSetToBaseplate}
              className="h-5 px-1.5 text-[8px]"
              title="Set to baseplate"
              aria-label="Set to baseplate"
            >
              <ArrowDownToLine className="w-2.5 h-2.5" />
            </Button>
          )}
          {onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-5 px-1.5 text-[8px]"
              title="Reset position"
              aria-label="Reset position"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </Button>
          )}
        </div>
      </div>
      <div className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <NumberInput
          value={position.x}
          onChange={handleChange('x')}
          label="X"
          axis="x"
          step={step}
          decimals={decimals}
        />
        {columns === 3 && (
          <NumberInput
            value={position.y}
            onChange={handleChange('y')}
            label="Y"
            axis="y"
            step={step}
            decimals={decimals}
          />
        )}
        <NumberInput
          value={position.z}
          onChange={handleChange('z')}
          label="Z"
          axis="z"
          step={step}
          decimals={decimals}
        />
      </div>
    </div>
  );
};

export default PositionControl;
