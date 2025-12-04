import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Upload, FileUp, Check, X } from 'lucide-react';
import FileDropzone from '@/modules/FileImport/components/FileDropzone';
import { ProcessedFile } from '@/modules/FileImport/types';

interface ImportStepContentProps {
  currentFile?: ProcessedFile | null;
  isProcessing?: boolean;
  error?: string | null;
  onFileSelected: (file: File) => void;
  onClearFile?: () => void;
}

const ImportStepContent: React.FC<ImportStepContentProps> = ({
  currentFile,
  isProcessing = false,
  error,
  onFileSelected,
  onClearFile
}) => {
  const hasFile = !!currentFile;

  return (
    <div className="p-4 space-y-4">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="font-tech">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* File Upload or File Info */}
      {!hasFile ? (
        <FileDropzone
          onFileSelected={onFileSelected}
          isProcessing={isProcessing}
          className="min-h-[180px]"
        />
      ) : (
        <Card className="tech-glass p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-tech font-semibold text-sm truncate">
                {currentFile.metadata.name}
              </p>
              <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground font-tech">
                <span>{currentFile.metadata.triangles?.toLocaleString()} triangles</span>
                <span>•</span>
                <span>{currentFile.metadata.units}</span>
              </div>
              {currentFile.metadata.dimensions && (
                <div className="mt-2 text-xs text-muted-foreground font-tech">
                  <span>Size: </span>
                  <span>
                    {currentFile.metadata.dimensions.x.toFixed(1)} × 
                    {currentFile.metadata.dimensions.y.toFixed(1)} × 
                    {currentFile.metadata.dimensions.z.toFixed(1)} {currentFile.metadata.units}
                  </span>
                </div>
              )}
            </div>
            {onClearFile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFile}
                className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Additional file action */}
      {hasFile && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-tech">
            You can import additional workpieces to your fixture
          </p>
          <FileDropzone
            onFileSelected={onFileSelected}
            isProcessing={isProcessing}
            className="min-h-[80px]"
          />
        </div>
      )}

      {/* Quick info when no file */}
      {!hasFile && !isProcessing && (
        <Card className="tech-glass">
          <div className="p-4 text-xs text-muted-foreground font-tech space-y-2">
            <p className="font-semibold text-foreground">Supported formats:</p>
            <div className="flex flex-wrap gap-2">
              {['STL', 'OBJ', 'GLTF', 'GLB'].map(fmt => (
                <span key={fmt} className="px-2 py-0.5 bg-muted/50 rounded text-xs">
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImportStepContent;
