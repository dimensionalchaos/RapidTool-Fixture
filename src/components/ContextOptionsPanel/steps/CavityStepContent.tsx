import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { GitMerge, AlertCircle, Minus, Box, Layers } from 'lucide-react';

interface CavityStepContentProps {
  hasWorkpiece?: boolean;
  hasBaseplate?: boolean;
  selectedMeshes?: string[];
  clearance?: number;
  onClearanceChange?: (clearance: number) => void;
  onExecuteSubtract?: () => void;
  onPreview?: () => void;
  isProcessing?: boolean;
}

const CavityStepContent: React.FC<CavityStepContentProps> = ({
  hasWorkpiece = false,
  hasBaseplate = false,
  selectedMeshes = [],
  clearance = 0.5,
  onClearanceChange,
  onExecuteSubtract,
  onPreview,
  isProcessing = false
}) => {
  const canProceed = hasWorkpiece && hasBaseplate;

  if (!canProceed) {
    return (
      <div className="p-4">
        <Alert className="font-tech">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {!hasWorkpiece 
              ? 'Import a workpiece first to create cavities.'
              : 'Create a baseplate first to subtract workpiece geometry.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Operation Description */}
      <Card className="tech-glass p-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Minus className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-tech font-medium">Boolean Subtract</p>
            <p className="text-xs text-muted-foreground font-tech">
              Create a cavity in the fixture to hold the workpiece
            </p>
          </div>
        </div>
      </Card>

      {/* Clearance Parameter */}
      <div className="space-y-3">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Clearance / Tolerance
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[clearance]}
            onValueChange={([v]) => onClearanceChange?.(v)}
            min={0}
            max={2}
            step={0.1}
            className="flex-1"
          />
          <Badge variant="secondary" className="font-tech min-w-[50px] justify-center">
            {clearance.toFixed(1)}mm
          </Badge>
        </div>
        <p className="text-[8px] text-muted-foreground font-tech">
          Add clearance around the workpiece for easier insertion/removal
        </p>
      </div>

      {/* Selection Status */}
      <div className="space-y-2">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Operation Components
        </Label>
        
        <div className="space-y-2">
          <Card className="tech-glass p-2">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-tech flex-1">Base (Fixture)</span>
              <Badge variant={hasBaseplate ? 'default' : 'secondary'} className="text-[8px]">
                {hasBaseplate ? 'Selected' : 'None'}
              </Badge>
            </div>
          </Card>
          
          <Card className="tech-glass p-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-tech flex-1">Tool (Workpiece)</span>
              <Badge variant={hasWorkpiece ? 'default' : 'secondary'} className="text-[8px]">
                {hasWorkpiece ? 'Selected' : 'None'}
              </Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full font-tech"
          onClick={onPreview}
          disabled={isProcessing}
        >
          Preview Result
        </Button>
        <Button
          variant="default"
          size="sm"
          className="w-full font-tech"
          onClick={onExecuteSubtract}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <GitMerge className="w-4 h-4 mr-2" />
              Execute Subtraction
            </>
          )}
        </Button>
      </div>

      {/* Info */}
      <Card className="tech-glass">
        <div className="p-3 text-xs text-muted-foreground font-tech">
          <p>
            The cavity operation subtracts the workpiece shape from the fixture, 
            creating a negative space that holds the part securely.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default CavityStepContent;
