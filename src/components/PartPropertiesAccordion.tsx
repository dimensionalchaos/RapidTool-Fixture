import React, { useState, useEffect, useCallback } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCcw, Move, RotateCw } from 'lucide-react';
import * as THREE from 'three';

interface PartTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number }; // in degrees for UI
}

interface PartPropertiesAccordionProps {
  hasModel: boolean;
}

const PartPropertiesAccordion: React.FC<PartPropertiesAccordionProps> = ({ hasModel }) => {
  const [transform, setTransform] = useState<PartTransform>({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  });
  
  // Store the initial transform when model is first loaded (for reset functionality)
  const [initialTransform, setInitialTransform] = useState<PartTransform | null>(null);

  // Convert radians to degrees for display
  const radToDeg = (rad: number) => (rad * 180) / Math.PI;
  // Convert degrees to radians for internal use
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  // Listen for transform updates from the 3D scene
  useEffect(() => {
    const handleTransformUpdate = (e: CustomEvent) => {
      const { position, rotation, isInitial } = e.detail;
      const newTransform = {
        position: {
          x: parseFloat(position.x.toFixed(2)),
          y: parseFloat(position.y.toFixed(2)),
          z: parseFloat(position.z.toFixed(2)),
        },
        rotation: {
          x: parseFloat(radToDeg(rotation.x).toFixed(1)),
          y: parseFloat(radToDeg(rotation.y).toFixed(1)),
          z: parseFloat(radToDeg(rotation.z).toFixed(1)),
        },
      };
      
      setTransform(newTransform);
      
      // Store initial transform when model is first loaded
      if (isInitial || !initialTransform) {
        setInitialTransform(newTransform);
      }
    };

    window.addEventListener('model-transform-updated', handleTransformUpdate as EventListener);
    
    // Request initial transform state
    window.dispatchEvent(new CustomEvent('request-model-transform'));

    return () => {
      window.removeEventListener('model-transform-updated', handleTransformUpdate as EventListener);
    };
  }, []);
  
  // Reset initial transform when model changes
  useEffect(() => {
    if (!hasModel) {
      setInitialTransform(null);
    }
  }, [hasModel]);

  // Dispatch transform change to 3D scene
  const dispatchTransformChange = useCallback((newTransform: PartTransform) => {
    window.dispatchEvent(
      new CustomEvent('set-model-transform', {
        detail: {
          position: new THREE.Vector3(
            newTransform.position.x,
            newTransform.position.y,
            newTransform.position.z
          ),
          rotation: new THREE.Euler(
            degToRad(newTransform.rotation.x),
            degToRad(newTransform.rotation.y),
            degToRad(newTransform.rotation.z)
          ),
        },
      })
    );
  }, []);

  // Handle position change
  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: string) => {
    const numValue = parseFloat(value) || 0;
    const newTransform = {
      ...transform,
      position: { ...transform.position, [axis]: numValue },
    };
    setTransform(newTransform);
    dispatchTransformChange(newTransform);
  };

  // Handle rotation change
  const handleRotationChange = (axis: 'x' | 'y' | 'z', value: string) => {
    const numValue = parseFloat(value) || 0;
    const newTransform = {
      ...transform,
      rotation: { ...transform.rotation, [axis]: numValue },
    };
    setTransform(newTransform);
    dispatchTransformChange(newTransform);
  };

  // Reset position to initial import position
  const handleResetPosition = () => {
    const resetPosition = initialTransform?.position ?? { x: 0, y: 0, z: 0 };
    const newTransform = {
      ...transform,
      position: resetPosition,
    };
    setTransform(newTransform);
    dispatchTransformChange(newTransform);
  };

  // Reset rotation to initial import rotation
  const handleResetRotation = () => {
    const resetRotation = initialTransform?.rotation ?? { x: 0, y: 0, z: 0 };
    const newTransform = {
      ...transform,
      rotation: resetRotation,
    };
    setTransform(newTransform);
    dispatchTransformChange(newTransform);
  };

  if (!hasModel) {
    return null;
  }

  return (
    <Accordion type="single" collapsible defaultValue="part-properties" className="w-full">
      <AccordionItem value="part-properties" className="border-border/50">
        <AccordionTrigger className="py-2 text-sm font-tech hover:no-underline">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-primary" />
            Part Properties
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2">
          <div className="space-y-4">
            {/* Position Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-tech text-muted-foreground flex items-center gap-1">
                  <Move className="w-3 h-3" />
                  Position (mm)
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetPosition}
                  className="h-6 px-2 text-xs"
                  title="Reset position to origin"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-red-500 font-mono">X</Label>
                  <Input
                    type="number"
                    value={transform.position.x}
                    onChange={(e) => handlePositionChange('x', e.target.value)}
                    className="h-8 text-xs font-mono"
                    step="0.1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-green-500 font-mono">Y</Label>
                  <Input
                    type="number"
                    value={transform.position.y}
                    onChange={(e) => handlePositionChange('y', e.target.value)}
                    className="h-8 text-xs font-mono"
                    step="0.1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-blue-500 font-mono">Z</Label>
                  <Input
                    type="number"
                    value={transform.position.z}
                    onChange={(e) => handlePositionChange('z', e.target.value)}
                    className="h-8 text-xs font-mono"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* Rotation Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-tech text-muted-foreground flex items-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  Rotation (°)
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetRotation}
                  className="h-6 px-2 text-xs"
                  title="Reset rotation"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-red-500 font-mono">X</Label>
                  <Input
                    type="number"
                    value={transform.rotation.x}
                    onChange={(e) => handleRotationChange('x', e.target.value)}
                    className="h-8 text-xs font-mono"
                    step="1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-green-500 font-mono">Y</Label>
                  <Input
                    type="number"
                    value={transform.rotation.y}
                    onChange={(e) => handleRotationChange('y', e.target.value)}
                    className="h-8 text-xs font-mono"
                    step="1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-blue-500 font-mono">Z</Label>
                  <Input
                    type="number"
                    value={transform.rotation.z}
                    onChange={(e) => handleRotationChange('z', e.target.value)}
                    className="h-8 text-xs font-mono"
                    step="1"
                  />
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default PartPropertiesAccordion;
