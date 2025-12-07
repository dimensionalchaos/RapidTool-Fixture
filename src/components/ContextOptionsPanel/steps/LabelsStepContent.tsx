import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, Type, Plus } from 'lucide-react';

interface LabelsStepContentProps {
  hasWorkpiece?: boolean;
  onAddLabel?: (label: LabelConfig) => void;
  labels?: LabelConfig[];
}

interface LabelConfig {
  id: string;
  text: string;
  fontSize: number;
  depth: number;
  type: 'emboss' | 'deboss';
}

const LabelsStepContent: React.FC<LabelsStepContentProps> = ({
  hasWorkpiece = false,
  onAddLabel,
  labels = []
}) => {
  const [labelText, setLabelText] = useState('V1.0');
  const [fontSize, setFontSize] = useState(10);
  const [depth, setDepth] = useState(1);
  const [labelType, setLabelType] = useState<'emboss' | 'deboss'>('deboss');

  if (!hasWorkpiece) {
    return (
      <div className="p-4">
        <Alert className="font-tech">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Import a workpiece or create a fixture to add labels.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleAddLabel = () => {
    onAddLabel?.({
      id: `label-${Date.now()}`,
      text: labelText,
      fontSize,
      depth,
      type: labelType
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Label Text Input */}
      <div className="space-y-2">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Label Text
        </Label>
        <Input
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
          placeholder="Enter label text..."
          className="font-tech"
        />
      </div>

      {/* Label Type */}
      <div className="space-y-2">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Label Type
        </Label>
        <RadioGroup value={labelType} onValueChange={(v) => setLabelType(v as 'emboss' | 'deboss')}>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="deboss" id="deboss" />
              <Label htmlFor="deboss" className="text-sm font-tech cursor-pointer">
                Deboss (inset)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="emboss" id="emboss" />
              <Label htmlFor="emboss" className="text-sm font-tech cursor-pointer">
                Emboss (raised)
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Font Size */}
      <div className="space-y-3">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Font Size
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[fontSize]}
            onValueChange={([v]) => setFontSize(v)}
            min={5}
            max={30}
            step={1}
            className="flex-1"
          />
          <Badge variant="secondary" className="font-tech min-w-[50px] justify-center">
            {fontSize}mm
          </Badge>
        </div>
      </div>

      {/* Depth */}
      <div className="space-y-3">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Depth
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[depth]}
            onValueChange={([v]) => setDepth(v)}
            min={0.5}
            max={5}
            step={0.5}
            className="flex-1"
          />
          <Badge variant="secondary" className="font-tech min-w-[50px] justify-center">
            {depth}mm
          </Badge>
        </div>
      </div>

      {/* Preview */}
      <Card className="tech-glass p-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-tech mb-2">Preview</p>
          <div 
            className={`
              inline-block px-4 py-2 rounded border-2
              ${labelType === 'deboss' 
                ? 'bg-muted/50 border-muted-foreground/30' 
                : 'bg-primary/10 border-primary/30'}
            `}
            style={{ fontSize: `${Math.min(fontSize, 20)}px` }}
          >
            <span className="font-tech font-bold">{labelText || 'Label'}</span>
          </div>
        </div>
      </Card>

      {/* Add Label Button */}
      <Button
        variant="default"
        size="sm"
        className="w-full font-tech"
        onClick={handleAddLabel}
        disabled={!labelText.trim()}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Label
      </Button>

      {/* Existing Labels */}
      {labels.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
            Labels ({labels.length})
          </p>
          <div className="space-y-1 max-h-[100px] overflow-auto">
            {labels.map((label, index) => (
              <Card key={label.id} className="tech-glass p-2">
                <div className="flex items-center gap-2">
                  <Type className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-tech flex-1 truncate">
                    "{label.text}"
                  </span>
                  <Badge variant="outline" className="text-[8px]">
                    {label.type}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelsStepContent;
