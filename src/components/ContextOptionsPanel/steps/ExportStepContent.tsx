import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { 
  DownloadCloud, 
  AlertCircle, 
  FileBox, 
  Check, 
  FileCheck,
  Settings2
} from 'lucide-react';

interface ExportStepContentProps {
  hasFixture?: boolean;
  onExport?: (settings: ExportSettings) => void;
  isExporting?: boolean;
  meshValid?: boolean;
  meshIssues?: string[];
}

interface ExportSettings {
  format: 'stl' | '3mf' | 'obj';
  binary: boolean;
  splitParts: boolean;
}

const EXPORT_FORMATS = [
  { id: 'stl', name: 'STL', description: 'Standard Tessellation Language', icon: FileBox },
  { id: '3mf', name: '3MF', description: '3D Manufacturing Format', icon: FileBox },
  { id: 'obj', name: 'OBJ', description: 'Wavefront OBJ', icon: FileBox },
];

const ExportStepContent: React.FC<ExportStepContentProps> = ({
  hasFixture = false,
  onExport,
  isExporting = false,
  meshValid = true,
  meshIssues = []
}) => {
  const [format, setFormat] = useState<'stl' | '3mf' | 'obj'>('stl');
  const [binary, setBinary] = useState(true);
  const [splitParts, setSplitParts] = useState(false);

  if (!hasFixture) {
    return (
      <div className="p-4">
        <Alert className="font-tech">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Create a fixture design first to export for 3D printing.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleExport = () => {
    onExport?.({
      format,
      binary,
      splitParts
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Mesh Validation Status */}
      <Card className={`tech-glass p-3 ${meshValid ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
        <div className="flex items-center gap-3">
          {meshValid ? (
            <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-500" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-md bg-yellow-500/10 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-tech font-medium">
              {meshValid ? 'Mesh is Valid' : 'Mesh Has Issues'}
            </p>
            <p className="text-xs text-muted-foreground font-tech">
              {meshValid 
                ? 'Ready for export' 
                : `${meshIssues.length} issue(s) detected`}
            </p>
          </div>
          {!meshValid && (
            <Button variant="outline" size="sm" className="font-tech text-xs">
              Repair
            </Button>
          )}
        </div>
        
        {!meshValid && meshIssues.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <ul className="text-xs text-yellow-600 dark:text-yellow-400 font-tech space-y-1">
              {meshIssues.map((issue, i) => (
                <li key={i}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Export Format Selection */}
      <div className="space-y-2">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Export Format
        </Label>
        
        <RadioGroup value={format} onValueChange={(v) => setFormat(v as typeof format)}>
          <div className="space-y-2">
            {EXPORT_FORMATS.map((fmt) => (
              <Card
                key={fmt.id}
                className={`
                  tech-glass p-3 cursor-pointer transition-all
                  hover:border-primary/50
                  ${format === fmt.id ? 'border-primary bg-primary/5' : ''}
                `}
                onClick={() => setFormat(fmt.id as typeof format)}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={fmt.id} id={fmt.id} />
                  <div className="flex-1">
                    <Label htmlFor={fmt.id} className="text-sm font-tech font-medium cursor-pointer">
                      {fmt.name}
                    </Label>
                    <p className="text-xs text-muted-foreground font-tech">
                      {fmt.description}
                    </p>
                  </div>
                  {format === fmt.id && (
                    <Badge variant="default" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Export Options */}
      <div className="space-y-2">
        <Label className="text-xs font-tech text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Settings2 className="w-3 h-3" />
          Options
        </Label>
        
        <div className="space-y-2">
          {format === 'stl' && (
            <Card className="tech-glass p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-tech font-medium">Binary Format</p>
                  <p className="text-xs text-muted-foreground font-tech">
                    Smaller file size (recommended)
                  </p>
                </div>
                <Switch
                  checked={binary}
                  onCheckedChange={setBinary}
                />
              </div>
            </Card>
          )}

          <Card className="tech-glass p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-tech font-medium">Split Parts</p>
                <p className="text-xs text-muted-foreground font-tech">
                  Export each component separately
                </p>
              </div>
              <Switch
                checked={splitParts}
                onCheckedChange={setSplitParts}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Export Button */}
      <Button
        variant="default"
        size="sm"
        className="w-full font-tech"
        onClick={handleExport}
        disabled={isExporting || !meshValid}
      >
        {isExporting ? (
          <>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            Exporting...
          </>
        ) : (
          <>
            <DownloadCloud className="w-4 h-4 mr-2" />
            Export {format.toUpperCase()}
          </>
        )}
      </Button>

      {/* Info */}
      <Card className="tech-glass">
        <div className="p-3 text-xs text-muted-foreground font-tech">
          <p>
            Export your fixture design for 3D printing. STL is widely supported,
            3MF includes material and color data, OBJ preserves UV coordinates.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ExportStepContent;
