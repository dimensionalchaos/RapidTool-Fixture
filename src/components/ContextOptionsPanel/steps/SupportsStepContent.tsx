import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Boxes, AlertCircle, MousePointer2, Square, Circle, Triangle, Spline } from 'lucide-react';

export type SupportType = 'rectangular' | 'cylindrical' | 'conical' | 'custom';

interface SupportsStepContentProps {
  hasBaseplate?: boolean;
  supportsCount?: number;
  isPlacementMode?: boolean;
  onTogglePlacementMode?: () => void;
  onStartPlacement?: (type: SupportType) => void;
  selectedSupportType?: SupportType;
  onSupportTypeChange?: (type: SupportType) => void;
}

const SUPPORT_TYPE_CONFIG: Record<SupportType, { label: string; icon: React.ReactNode; description: string }> = {
  rectangular: {
    label: 'Rect',
    icon: <Square className="w-4 h-4" />,
    description: 'Box-shaped support with configurable width and depth'
  },
  cylindrical: {
    label: 'Cyl',
    icon: <Circle className="w-4 h-4" />,
    description: 'Cylindrical support with configurable radius'
  },
  conical: {
    label: 'Cone',
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
  onTogglePlacementMode,
  onStartPlacement,
  selectedSupportType = 'cylindrical',
  onSupportTypeChange
}) => {
  const [localType, setLocalType] = useState<SupportType>(selectedSupportType);

  const handleTypeChange = (type: SupportType) => {
    setLocalType(type);
    onSupportTypeChange?.(type);
  };

  const handleStartPlacement = () => {
    onStartPlacement?.(localType);
    // Dispatch the event for the 3D scene
    window.dispatchEvent(new CustomEvent('supports-start-placement', {
      detail: { type: localType, params: {} }
    }));
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
      {/* Support Type Selection */}
      <div className="space-y-3">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Support Type
        </Label>
        <Tabs value={localType} onValueChange={(v) => handleTypeChange(v as SupportType)}>
          <TabsList className="grid grid-cols-4 h-9">
            {Object.entries(SUPPORT_TYPE_CONFIG).map(([type, config]) => (
              <TabsTrigger 
                key={type} 
                value={type} 
                className="text-xs font-tech gap-1 px-2"
                title={config.description}
              >
                {config.icon}
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-[10px] text-muted-foreground font-tech">
          {SUPPORT_TYPE_CONFIG[localType].description}
        </p>
      </div>

      {/* Placement Mode Card */}
      <Card className={`tech-glass p-3 ${isPlacementMode ? 'border-primary bg-primary/5' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MousePointer2 className={`w-5 h-5 ${isPlacementMode ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-tech font-medium">Placement Mode</p>
              <p className="text-xs text-muted-foreground font-tech">
                {isPlacementMode ? 'Click on baseplate to place' : 'Enable to add supports'}
              </p>
            </div>
          </div>
          <Switch
            checked={isPlacementMode}
            onCheckedChange={() => {
              if (!isPlacementMode) {
                handleStartPlacement();
              } else {
                window.dispatchEvent(new Event('supports-cancel-placement'));
              }
              onTogglePlacementMode?.();
            }}
          />
        </div>
      </Card>

      {/* Placement Instructions */}
      {isPlacementMode && (
        <Card className="tech-glass p-3 bg-primary/5 border-primary/30">
          <div className="space-y-2">
            <p className="text-xs font-tech font-medium text-primary">Placement Instructions</p>
            <ol className="text-[10px] text-muted-foreground font-tech space-y-1 list-decimal list-inside">
              <li>Click on the baseplate to set the center point</li>
              <li>Drag outward to set the size/radius</li>
              <li>Click again or drag up to confirm height</li>
              <li>Support height auto-adjusts to touch the model</li>
            </ol>
          </div>
        </Card>
      )}

      {/* Summary */}
      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-muted-foreground" />
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
            className="flex-1 font-tech text-xs"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('supports-auto-arrange'));
            }}
          >
            Auto-Arrange
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 font-tech text-xs text-destructive hover:text-destructive"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('supports-clear-all'));
            }}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};

export default SupportsStepContent;
