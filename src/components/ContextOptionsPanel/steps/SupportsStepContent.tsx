import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Boxes, Plus, Trash2, AlertCircle, MousePointer2 } from 'lucide-react';

interface Support {
  id: string;
  type: string;
  height: number;
  position: { x: number; y: number; z: number };
}

interface SupportsStepContentProps {
  hasBaseplate?: boolean;
  supports?: Support[];
  isPlacementMode?: boolean;
  onTogglePlacementMode?: () => void;
  onSupportSelect?: (supportId: string) => void;
  onSupportDelete?: (supportId: string) => void;
  selectedSupportId?: string | null;
  supportHeight?: number;
  onSupportHeightChange?: (height: number) => void;
}

const SupportsStepContent: React.FC<SupportsStepContentProps> = ({
  hasBaseplate = false,
  supports = [],
  isPlacementMode = false,
  onTogglePlacementMode,
  onSupportSelect,
  onSupportDelete,
  selectedSupportId,
  supportHeight = 20,
  onSupportHeightChange
}) => {
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
      {/* Placement Mode Toggle */}
      <Card className={`tech-glass p-3 ${isPlacementMode ? 'border-primary bg-primary/5' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MousePointer2 className={`w-5 h-5 ${isPlacementMode ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-tech font-medium">Placement Mode</p>
              <p className="text-xs text-muted-foreground font-tech">
                Click on baseplate to add supports
              </p>
            </div>
          </div>
          <Switch
            checked={isPlacementMode}
            onCheckedChange={onTogglePlacementMode}
          />
        </div>
      </Card>

      {/* Support Parameters */}
      <div className="space-y-3">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Support Height
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[supportHeight]}
            onValueChange={([v]) => onSupportHeightChange?.(v)}
            min={5}
            max={100}
            step={1}
            className="flex-1"
          />
          <Badge variant="secondary" className="font-tech min-w-[50px] justify-center">
            {supportHeight}mm
          </Badge>
        </div>
      </div>

      {/* Placed Supports List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
            Supports ({supports.length})
          </Label>
          {isPlacementMode && (
            <Badge variant="outline" className="text-xs animate-pulse">
              Click to place
            </Badge>
          )}
        </div>

        {supports.length === 0 ? (
          <Card className="tech-glass p-4 text-center">
            <Boxes className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground font-tech">
              No supports placed yet
            </p>
            <p className="text-xs text-muted-foreground font-tech mt-1">
              Enable placement mode and click on the baseplate
            </p>
          </Card>
        ) : (
          <div className="space-y-1 max-h-[200px] overflow-auto">
            {supports.map((support, index) => (
              <Card
                key={support.id}
                className={`
                  tech-glass p-2 cursor-pointer transition-all
                  hover:border-primary/50
                  ${selectedSupportId === support.id ? 'border-primary bg-primary/10' : ''}
                `}
                onClick={() => onSupportSelect?.(support.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center text-xs font-tech">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-tech">Support {index + 1}</p>
                      <p className="text-[8px] text-muted-foreground font-tech">
                        Height: {support.height}mm
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSupportDelete?.(support.id);
                    }}
                    className="w-6 h-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      {supports.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 font-tech text-xs"
            onClick={() => {
              // Auto-arrange supports
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
              // Clear all supports
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
