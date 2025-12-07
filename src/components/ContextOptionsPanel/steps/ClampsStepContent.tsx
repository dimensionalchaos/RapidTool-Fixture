import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pin, AlertCircle, Plus, GripVertical } from 'lucide-react';

interface ClampType {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

const CLAMP_TYPES: ClampType[] = [
  { id: 'toggle', name: 'Toggle Clamp', description: 'Quick-release toggle mechanism' },
  { id: 'screw', name: 'Screw Clamp', description: 'Threaded screw adjustment' },
  { id: 'cam', name: 'Cam Clamp', description: 'Eccentric cam locking' },
  { id: 'spring', name: 'Spring Clamp', description: 'Spring-loaded pressure' },
  { id: 'custom', name: 'Custom Clamp', description: 'Import your own design' },
];

interface ClampsStepContentProps {
  hasWorkpiece?: boolean;
  placedClamps?: Array<{ id: string; type: string; position: any }>;
  onSelectClampType?: (type: string) => void;
  onPlaceClamp?: () => void;
  selectedClampType?: string | null;
}

const ClampsStepContent: React.FC<ClampsStepContentProps> = ({
  hasWorkpiece = false,
  placedClamps = [],
  onSelectClampType,
  onPlaceClamp,
  selectedClampType
}) => {
  if (!hasWorkpiece) {
    return (
      <div className="p-4">
        <Alert className="font-tech">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Import a workpiece first to add clamps.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Clamp Type Selection */}
      <div className="space-y-2">
        <p className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Select Clamp Type
        </p>
        
        <div className="grid gap-2">
          {CLAMP_TYPES.map((clamp) => (
            <Card
              key={clamp.id}
              className={`
                tech-glass p-3 cursor-pointer transition-all
                hover:border-primary/50 hover:bg-primary/5
                ${selectedClampType === clamp.id ? 'border-primary bg-primary/10' : ''}
              `}
              onClick={() => onSelectClampType?.(clamp.id)}
            >
              <div className="flex items-center gap-3">
                <Pin className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-tech font-medium">{clamp.name}</p>
                  <p className="text-xs text-muted-foreground font-tech">
                    {clamp.description}
                  </p>
                </div>
                {selectedClampType === clamp.id && (
                  <Badge variant="default" className="text-xs">
                    Selected
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Place Clamp Button */}
      {selectedClampType && (
        <Button
          variant="default"
          size="sm"
          className="w-full font-tech"
          onClick={onPlaceClamp}
        >
          <Plus className="w-4 h-4 mr-2" />
          Place Clamp
        </Button>
      )}

      {/* Placed Clamps List */}
      {placedClamps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
            Placed Clamps ({placedClamps.length})
          </p>
          <div className="space-y-1 max-h-[150px] overflow-auto">
            {placedClamps.map((clamp, index) => (
              <Card key={clamp.id} className="tech-glass p-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-tech flex-1">
                    Clamp {index + 1} ({clamp.type})
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <Card className="tech-glass">
        <div className="p-3 text-xs text-muted-foreground font-tech">
          <p>
            Clamps secure the workpiece in place during machining operations.
            Position them to provide adequate holding force without interfering
            with tool paths.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ClampsStepContent;
