import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Scissors, AlertCircle, Zap, Box, TrendingDown } from 'lucide-react';

interface OptimizeStepContentProps {
  hasFixture?: boolean;
  onOptimize?: (settings: OptimizeSettings) => void;
  isOptimizing?: boolean;
  optimizationResult?: OptimizationResult | null;
}

interface OptimizeSettings {
  hollowThickness: number;
  infillDensity: number;
  removeInternalVoids: boolean;
}

interface OptimizationResult {
  originalVolume: number;
  optimizedVolume: number;
  savedMaterial: number;
  estimatedPrintTime: {
    original: number;
    optimized: number;
  };
}

const OptimizeStepContent: React.FC<OptimizeStepContentProps> = ({
  hasFixture = false,
  onOptimize,
  isOptimizing = false,
  optimizationResult
}) => {
  const [hollowThickness, setHollowThickness] = useState(3);
  const [infillDensity, setInfillDensity] = useState(20);
  const [removeVoids, setRemoveVoids] = useState(true);

  if (!hasFixture) {
    return (
      <div className="p-4">
        <Alert className="font-tech">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Create a fixture design first to optimize material usage.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleOptimize = () => {
    onOptimize?.({
      hollowThickness,
      infillDensity,
      removeInternalVoids: removeVoids
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Optimization Description */}
      <Card className="tech-glass p-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-tech font-medium">Material Optimization</p>
            <p className="text-xs text-muted-foreground font-tech">
              Reduce material usage and print time while maintaining strength
            </p>
          </div>
        </div>
      </Card>

      {/* Wall Thickness */}
      <div className="space-y-3">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Wall Thickness
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[hollowThickness]}
            onValueChange={([v]) => setHollowThickness(v)}
            min={1}
            max={10}
            step={0.5}
            className="flex-1"
          />
          <Badge variant="secondary" className="font-tech min-w-[50px] justify-center">
            {hollowThickness}mm
          </Badge>
        </div>
        <p className="text-[8px] text-muted-foreground font-tech">
          Minimum wall thickness for structural integrity
        </p>
      </div>

      {/* Infill Density */}
      <div className="space-y-3">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Infill Density
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[infillDensity]}
            onValueChange={([v]) => setInfillDensity(v)}
            min={0}
            max={100}
            step={5}
            className="flex-1"
          />
          <Badge variant="secondary" className="font-tech min-w-[50px] justify-center">
            {infillDensity}%
          </Badge>
        </div>
      </div>

      {/* Remove Internal Voids */}
      <Card className="tech-glass p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Box className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-tech font-medium">Remove Internal Voids</p>
              <p className="text-xs text-muted-foreground font-tech">
                Clean up internal geometry
              </p>
            </div>
          </div>
          <Switch
            checked={removeVoids}
            onCheckedChange={setRemoveVoids}
          />
        </div>
      </Card>

      {/* Optimize Button */}
      <Button
        variant="default"
        size="sm"
        className="w-full font-tech"
        onClick={handleOptimize}
        disabled={isOptimizing}
      >
        {isOptimizing ? (
          <>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            Optimizing...
          </>
        ) : (
          <>
            <Scissors className="w-4 h-4 mr-2" />
            Analyze & Optimize
          </>
        )}
      </Button>

      {/* Results */}
      {optimizationResult && (
        <Card className="tech-glass p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-green-500" />
            <span className="text-sm font-tech font-semibold text-green-500">
              Optimization Results
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-tech">
              <span className="text-muted-foreground">Original Volume</span>
              <span>{optimizationResult.originalVolume.toFixed(1)} cm³</span>
            </div>
            <div className="flex justify-between text-xs font-tech">
              <span className="text-muted-foreground">Optimized Volume</span>
              <span>{optimizationResult.optimizedVolume.toFixed(1)} cm³</span>
            </div>
            <div className="flex justify-between text-xs font-tech text-green-500">
              <span>Material Saved</span>
              <span>{optimizationResult.savedMaterial.toFixed(1)}%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <div className="flex justify-between text-xs font-tech">
              <span className="text-muted-foreground">Est. Print Time Reduction</span>
              <span className="text-green-500">
                ~{Math.round((1 - optimizationResult.estimatedPrintTime.optimized / optimizationResult.estimatedPrintTime.original) * 100)}%
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Info */}
      <Card className="tech-glass">
        <div className="p-3 text-xs text-muted-foreground font-tech">
          <p>
            Optimization reduces material usage by hollowing solid sections
            and adding internal support structures where needed.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default OptimizeStepContent;
