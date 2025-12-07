import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CircleDashed, AlertCircle, Circle, Square, Plus } from 'lucide-react';

interface DrillStepContentProps {
  hasWorkpiece?: boolean;
  onAddHole?: (config: HoleConfig) => void;
  holes?: HoleConfig[];
}

interface HoleConfig {
  id: string;
  type: 'through' | 'blind';
  shape: 'circle' | 'square';
  diameter: number;
  depth?: number;
}

const STANDARD_SIZES = [3, 4, 5, 6, 8, 10, 12];

const DrillStepContent: React.FC<DrillStepContentProps> = ({
  hasWorkpiece = false,
  onAddHole,
  holes = []
}) => {
  const [holeType, setHoleType] = useState<'through' | 'blind'>('through');
  const [holeShape, setHoleShape] = useState<'circle' | 'square'>('circle');
  const [diameter, setDiameter] = useState(5);
  const [depth, setDepth] = useState(10);

  if (!hasWorkpiece) {
    return (
      <div className="p-4">
        <Alert className="font-tech">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Import a workpiece or create a fixture to add holes and cutouts.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleAddHole = () => {
    onAddHole?.({
      id: `hole-${Date.now()}`,
      type: holeType,
      shape: holeShape,
      diameter,
      depth: holeType === 'blind' ? depth : undefined
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Hole Type */}
      <div className="space-y-2">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Hole Type
        </Label>
        <RadioGroup value={holeType} onValueChange={(v) => setHoleType(v as 'through' | 'blind')}>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="through" id="through" />
              <Label htmlFor="through" className="text-sm font-tech cursor-pointer">
                Through Hole
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="blind" id="blind" />
              <Label htmlFor="blind" className="text-sm font-tech cursor-pointer">
                Blind Hole
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Hole Shape */}
      <div className="space-y-2">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Shape
        </Label>
        <div className="flex gap-2">
          <Button
            variant={holeShape === 'circle' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 font-tech"
            onClick={() => setHoleShape('circle')}
          >
            <Circle className="w-4 h-4 mr-2" />
            Circle
          </Button>
          <Button
            variant={holeShape === 'square' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 font-tech"
            onClick={() => setHoleShape('square')}
          >
            <Square className="w-4 h-4 mr-2" />
            Square
          </Button>
        </div>
      </div>

      {/* Standard Sizes Quick Select */}
      <div className="space-y-2">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Standard Sizes
        </Label>
        <div className="flex flex-wrap gap-1">
          {STANDARD_SIZES.map((size) => (
            <Button
              key={size}
              variant={diameter === size ? 'default' : 'outline'}
              size="sm"
              className="font-tech text-xs px-2 py-1 h-7"
              onClick={() => setDiameter(size)}
            >
              {size}mm
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Diameter */}
      <div className="space-y-3">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Diameter
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[diameter]}
            onValueChange={([v]) => setDiameter(v)}
            min={1}
            max={50}
            step={0.5}
            className="flex-1"
          />
          <Badge variant="secondary" className="font-tech min-w-[50px] justify-center">
            {diameter}mm
          </Badge>
        </div>
      </div>

      {/* Depth (for blind holes) */}
      {holeType === 'blind' && (
        <div className="space-y-3">
          <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
            Depth
          </Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[depth]}
              onValueChange={([v]) => setDepth(v)}
              min={1}
              max={100}
              step={1}
              className="flex-1"
            />
            <Badge variant="secondary" className="font-tech min-w-[50px] justify-center">
              {depth}mm
            </Badge>
          </div>
        </div>
      )}

      {/* Add Hole Button */}
      <Button
        variant="default"
        size="sm"
        className="w-full font-tech"
        onClick={handleAddHole}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Hole (click to place)
      </Button>

      {/* Existing Holes */}
      {holes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
            Holes ({holes.length})
          </p>
          <div className="space-y-1 max-h-[100px] overflow-auto">
            {holes.map((hole, index) => (
              <Card key={hole.id} className="tech-glass p-2">
                <div className="flex items-center gap-2">
                  {hole.shape === 'circle' ? (
                    <Circle className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <Square className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className="text-xs font-tech flex-1">
                    Hole {index + 1} - Ø{hole.diameter}mm
                  </span>
                  <Badge variant="outline" className="text-[8px]">
                    {hole.type}
                  </Badge>
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
            Add mounting holes, access cutouts, or weight-reduction features
            to your fixture design.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default DrillStepContent;
