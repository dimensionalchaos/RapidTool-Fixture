import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Cuboid, AlertCircle, MousePointer2, Square, Circle, Triangle, Spline, Wand2, Trash2, Check, Magnet } from 'lucide-react';

export type SupportType = 'rectangular' | 'cylindrical' | 'conical' | 'custom';

interface SupportsStepContentProps {
  hasBaseplate?: boolean;
  supportsCount?: number;
  isPlacementMode?: boolean;
  onStartPlacement?: (type: SupportType) => void;
  onCancelPlacement?: () => void;
  selectedSupportType?: SupportType;
  onSupportTypeChange?: (type: SupportType) => void;
}

const SUPPORT_TYPE_CONFIG: Record<SupportType, { label: string; icon: React.ReactNode; description: string }> = {
  rectangular: {
    label: 'Rectangular',
    icon: <Square className="w-4 h-4" />,
    description: 'Box-shaped support with configurable width and depth'
  },
  cylindrical: {
    label: 'Cylindrical',
    icon: <Circle className="w-4 h-4" />,
    description: 'Cylindrical support with configurable radius'
  },
  conical: {
    label: 'Conical',
    icon: <Triangle className="w-4 h-4" />,
    description: 'Tapered support with base and top radius'
  },
  custom: {
    label: 'Custom',
    icon: <Spline className="w-4 h-4" />,
    description: 'Draw a custom polygon shape'
  }
};

const SupportsStepContent: React.FC<SupportsStepContentProps> = ({
  hasBaseplate = false,
  supportsCount = 0,
  isPlacementMode = false,
  onStartPlacement,
  onCancelPlacement,
  selectedSupportType = 'cylindrical',
  onSupportTypeChange
}) => {
  const [localType, setLocalType] = useState<SupportType | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // Handle escape key to cancel placement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlacementMode) {
        handleCancelPlacement();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlacementMode]);

  const handleTypeSelect = (type: SupportType) => {
    setLocalType(type);
    onSupportTypeChange?.(type);
    onStartPlacement?.(type);
    // Dispatch snap enabled state first
    window.dispatchEvent(new CustomEvent('support-snap-enabled-changed', {
      detail: { enabled: snapEnabled }
    }));
    // Dispatch the event for the 3D scene
    window.dispatchEvent(new CustomEvent('supports-start-placement', {
      detail: { type, params: {} }
    }));
  };

  const handleSnapToggle = (enabled: boolean) => {
    setSnapEnabled(enabled);
    window.dispatchEvent(new CustomEvent('support-snap-enabled-changed', {
      detail: { enabled }
    }));
  };

  const handleCancelPlacement = () => {
    setLocalType(null);
    onCancelPlacement?.();
    window.dispatchEvent(new Event('supports-cancel-placement'));
  };

  if (!hasBaseplate) {
    return (
      <div className="p-4">
        <Alert className="font-tech">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Create a baseplate first before adding supports.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Supports Status - Small indicator */}
      {supportsCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <Check className="w-5 h-5 text-green-500" />
          <span className="text-sm font-tech text-green-600">
            {supportsCount} support{supportsCount !== 1 ? 's' : ''} placed
          </span>
          <span className="text-xs text-muted-foreground font-tech ml-auto">
            View in Properties Panel →
          </span>
        </div>
      )}

      {/* Support Type Selection */}
      <div className="space-y-3">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Select Support Type to Place
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(SUPPORT_TYPE_CONFIG).map(([type, config]) => {
            const isSelected = localType === type && isPlacementMode;
            return (
              <Button
                key={type}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`h-auto py-3 flex flex-col items-center gap-1.5 font-tech ${
                  isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={() => handleTypeSelect(type as SupportType)}
                title={config.description}
              >
                {config.icon}
                <span className="text-xs">{config.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Snap Alignment Toggle */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Magnet className="w-4 h-4 text-muted-foreground" />
          <Label htmlFor="support-snap-toggle" className="text-xs font-tech">
            Snap to Alignment
          </Label>
        </div>
        <Switch
          id="support-snap-toggle"
          checked={snapEnabled}
          onCheckedChange={handleSnapToggle}
        />
      </div>

      {/* Placement Mode Indicator */}
      {isPlacementMode && localType && (
        <Card className="tech-glass p-3 bg-primary/5 border-primary/30">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-primary animate-pulse" />
                <p className="text-xs font-tech font-medium text-primary">
                  Placing {SUPPORT_TYPE_CONFIG[localType].label} Support
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleCancelPlacement}
              >
                Cancel
              </Button>
            </div>
            <ol className="text-[10px] text-muted-foreground font-tech space-y-1 list-decimal list-inside">
              <li>Click on the baseplate to set the center point</li>
              <li>Drag outward to set the size/radius</li>
              <li>Height auto-adjusts to touch the model</li>
              <li>Press <kbd className="px-1 py-0.5 bg-muted rounded text-[8px]">Esc</kbd> to cancel</li>
            </ol>
          </div>
        </Card>
      )}

      {/* Summary */}
      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cuboid className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-tech text-muted-foreground">
              Total Supports
            </span>
          </div>
          <Badge variant="secondary" className="font-tech">
            {supportsCount}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground font-tech mt-2">
          View and edit individual supports in the Properties panel →
        </p>
      </div>

      {/* Quick Actions */}
      {supportsCount > 0 && (
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 font-tech text-xs text-destructive hover:text-destructive"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('supports-clear-all'));
            }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        </div>
      )}

      {/* Auto-Place Supports Section */}
      <div className="pt-3 border-t border-border/50 space-y-3">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Auto-Place Supports
        </Label>
        
        <div className="space-y-2">
          <Button
            variant="default"
            size="sm"
            className="w-full font-tech text-xs"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('supports-auto-place', {
                detail: {
                  // Using intelligent shape detection - no options needed
                }
              }));
            }}
          >
            <Wand2 className="w-3 h-3 mr-1" />
            Auto-Place Supports
          </Button>
          
          <p className="text-[9px] text-muted-foreground font-tech">
            Analyzes overhanging surfaces and automatically places supports.
            Shape is intelligently selected: rectangular for elongated areas, cylindrical for circular areas, custom for irregular shapes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupportsStepContent;
