import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  TriangleAlert,
  Cpu,
  Minimize2,
  Box,
} from 'lucide-react';
import {
  MeshAnalysisResult,
  MeshProcessingProgress,
  DECIMATION_THRESHOLD,
  DECIMATION_TARGET,
} from '../services/meshAnalysis';

interface MeshOptimizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: MeshAnalysisResult | null;
  progress: MeshProcessingProgress | null;
  isProcessing: boolean;
  onProceedWithOriginal: () => void;
  onOptimizeMesh: () => void;
  onCancel: () => void;
}

const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const MeshOptimizationDialog: React.FC<MeshOptimizationDialogProps> = ({
  open,
  onOpenChange,
  analysis,
  progress,
  isProcessing,
  onProceedWithOriginal,
  onOptimizeMesh,
  onCancel,
}) => {
  const needsDecimation = analysis && analysis.triangleCount > DECIMATION_THRESHOLD;
  const hasIssues = analysis && analysis.issues.length > 0;
  
  const getStageIcon = () => {
    if (!progress) return null;
    
    switch (progress.stage) {
      case 'analyzing':
        return <Cpu className="w-4 h-4 animate-pulse" />;
      case 'repairing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'decimating':
        return <Minimize2 className="w-4 h-4 animate-pulse" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="w-5 h-5" />
            Mesh Analysis
          </DialogTitle>
          <DialogDescription>
            Review the mesh analysis results and decide how to proceed.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Section - shown during processing */}
        {isProcessing && progress && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStageIcon()}
              <span className="text-sm font-medium capitalize">{progress.stage}</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          </div>
        )}

        {/* Analysis Results - shown after analysis */}
        {!isProcessing && analysis && (
          <div className="space-y-4">
            {/* Triangle Count */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Triangle Count</span>
              </div>
              <Badge variant={needsDecimation ? 'destructive' : 'secondary'}>
                {formatNumber(analysis.triangleCount)}
              </Badge>
            </div>

            {/* Vertex Count */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Vertex Count</span>
              </div>
              <Badge variant="secondary">
                {formatNumber(analysis.vertexCount)}
              </Badge>
            </div>

            {/* Manifold Status */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Mesh Status</span>
              </div>
              {analysis.isManifold ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Manifold
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Non-Manifold
                </Badge>
              )}
            </div>

            {/* Bounding Box */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Bounding Box</span>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>X: {analysis.boundingBox.size.x.toFixed(2)}</div>
                <div>Y: {analysis.boundingBox.size.y.toFixed(2)}</div>
                <div>Z: {analysis.boundingBox.size.z.toFixed(2)}</div>
              </div>
            </div>

            <Separator />

            {/* Issues Section */}
            {hasIssues && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TriangleAlert className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">Issues Detected</span>
                </div>
                <div className="space-y-1">
                  {analysis.issues.map((issue, index) => (
                    <Alert key={index} variant="default" className="py-2">
                      <AlertDescription className="text-xs">
                        {issue}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* High Triangle Count Warning */}
            {needsDecimation && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="ml-2">
                  <strong>High triangle count detected!</strong>
                  <br />
                  <span className="text-xs">
                    This mesh has {formatNumber(analysis.triangleCount)} triangles, 
                    which exceeds the recommended threshold of {formatNumber(DECIMATION_THRESHOLD)}.
                    <br /><br />
                    <strong>Recommendation:</strong> Optimize the mesh to reduce it to ~{formatNumber(DECIMATION_TARGET)} triangles 
                    for better performance in downstream operations (boolean operations, support generation, etc.).
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* No Issues */}
            {!hasIssues && !needsDecimation && (
              <Alert>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <AlertDescription className="ml-2">
                  Mesh looks good! No issues detected.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          {needsDecimation ? (
            <>
              <Button
                variant="secondary"
                onClick={onProceedWithOriginal}
                disabled={isProcessing}
              >
                Use Original
              </Button>
              <Button
                onClick={onOptimizeMesh}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-4 h-4 mr-2" />
                    Optimize Mesh
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={onProceedWithOriginal}
              disabled={isProcessing}
            >
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MeshOptimizationDialog;
