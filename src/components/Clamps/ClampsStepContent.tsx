import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Pin, 
  AlertCircle, 
  Plus, 
  ChevronRight,
  ChevronDown,
  ArrowDown,
  ArrowRight,
  ExternalLink,
  Zap,
  MousePointer,
  X
} from 'lucide-react';
import { 
  ClampModel, 
  ClampCategory, 
  ClampCategoryGroup
} from './types';
import { 
  getClampCategories, 
  CATEGORY_INFO 
} from './clampData';

interface ClampsStepContentProps {
  hasWorkpiece?: boolean;
}

const ClampsStepContent: React.FC<ClampsStepContentProps> = ({
  hasWorkpiece = false,
}) => {
  const [categories, setCategories] = useState<ClampCategoryGroup[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [selectedClamp, setSelectedClamp] = useState<ClampModel | null>(null);
  const [expandedClamp, setExpandedClamp] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(true);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  
  // Track expanded accordion categories
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    // Load clamp categories
    const clampCategories = getClampCategories();
    setCategories(clampCategories);
    
    // Expand categories that have clamps by default
    const categoriesWithClamps: string[] = [];
    clampCategories.forEach(cat => {
      if (cat.clamps.length > 0) {
        categoriesWithClamps.push(cat.category);
      }
    });
    setExpandedCategories(categoriesWithClamps);
  }, []);

  // Listen for clamp placed event to exit placement mode
  useEffect(() => {
    const handleClampPlaced = () => {
      setIsPlacementMode(false);
    };
    
    const handlePlacementCancelled = () => {
      setIsPlacementMode(false);
    };
    
    window.addEventListener('clamp-placed', handleClampPlaced);
    window.addEventListener('clamp-placement-cancelled', handlePlacementCancelled);
    
    return () => {
      window.removeEventListener('clamp-placed', handleClampPlaced);
      window.removeEventListener('clamp-placement-cancelled', handlePlacementCancelled);
    };
  }, []);

  const handleImageError = (clampId: string) => {
    setImageErrors(prev => new Set(prev).add(clampId));
  };

  const getCategoryIcon = (category: ClampCategory) => {
    if (category === 'Toggle Clamps Vertical') {
      return <ArrowDown className="w-4 h-4" />;
    }
    return <ArrowRight className="w-4 h-4" />;
  };

  const handleStartPlacement = () => {
    if (!selectedClamp) return;
    
    setIsPlacementMode(true);
    
    // Dispatch event to 3DScene to enter placement mode
    window.dispatchEvent(new CustomEvent('clamp-start-placement', { 
      detail: { 
        clampModelId: selectedClamp.id,
        clampCategory: selectedClamp.category
      } 
    }));
  };

  const handleCancelPlacement = () => {
    setIsPlacementMode(false);
    window.dispatchEvent(new CustomEvent('clamp-cancel-placement'));
  };

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
      {/* Clamp Categories */}
      <div className="space-y-2">
        <p className="text-xs font-tech text-muted-foreground uppercase tracking-wider">
          Select Clamp Type
        </p>
        
        <ScrollArea className="h-[300px]">
          <Accordion 
            type="multiple" 
            value={expandedCategories}
            onValueChange={setExpandedCategories}
            className="space-y-1"
          >
            {categories.map((categoryGroup) => (
              <AccordionItem 
                key={categoryGroup.category} 
                value={categoryGroup.category}
                className="border rounded-lg tech-glass overflow-hidden"
              >
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-primary/5 [&[data-state=open]]:bg-primary/5">
                  <div className="flex items-center gap-2 flex-1">
                    {getCategoryIcon(categoryGroup.category)}
                    <div className="flex-1 text-left">
                      <p className="text-xs font-tech font-medium">
                        {categoryGroup.category}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-tech">
                        {CATEGORY_INFO[categoryGroup.category]?.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] mr-2">
                      {categoryGroup.clamps.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="pb-0">
                  <div className="px-2 pb-2 space-y-1">
                    {categoryGroup.clamps.length === 0 ? (
                      <p className="text-xs text-muted-foreground font-tech italic py-2 px-1">
                        No clamps available in this category
                      </p>
                    ) : (
                      categoryGroup.clamps.map((clamp) => {
                        const isSelected = selectedClamp?.id === clamp.id;
                        const isExpanded = expandedClamp === clamp.id;
                        
                        return (
                          <Collapsible
                            key={clamp.id}
                            open={isExpanded}
                            onOpenChange={(open) => setExpandedClamp(open ? clamp.id : null)}
                          >
                            <Card
                              className={`
                                tech-glass transition-all overflow-hidden
                                ${isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'hover:border-primary/50 hover:bg-primary/5'}
                              `}
                            >
                              {/* Compact Row - Always Visible */}
                              <div
                                className="flex items-center gap-2 p-2 cursor-pointer"
                                onClick={() => setSelectedClamp(clamp)}
                              >
                                {/* Thumbnail */}
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {clamp.imagePath && !imageErrors.has(clamp.id) ? (
                                    <img 
                                      src={clamp.imagePath} 
                                      alt={clamp.name}
                                      className="w-full h-full object-cover"
                                      onError={() => handleImageError(clamp.id)}
                                    />
                                  ) : (
                                    <Pin className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                
                                {/* Name */}
                                <span className="text-xs font-tech font-medium truncate flex-1 min-w-0">
                                  {clamp.name}
                                </span>
                                
                                {/* Force Badge */}
                                {clamp.info.force && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono flex-shrink-0">
                                    <Zap className="w-2.5 h-2.5 mr-0.5" />
                                    {clamp.info.force}
                                  </Badge>
                                )}
                                
                                {/* Expand Toggle */}
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                              
                              {/* Expanded Content */}
                              <CollapsibleContent>
                                <div className="px-2 pb-2 pt-0 border-t border-border/50">
                                  <div className="pt-2 space-y-2">
                                    {/* Full Image */}
                                    {clamp.imagePath && !imageErrors.has(clamp.id) && (
                                      <div className="w-full h-24 rounded bg-muted overflow-hidden">
                                        <img 
                                          src={clamp.imagePath} 
                                          alt={clamp.name}
                                          className="w-full h-full object-contain"
                                          onError={() => handleImageError(clamp.id)}
                                        />
                                      </div>
                                    )}
                                    
                                    {/* Details */}
                                    <div className="text-xs text-muted-foreground font-tech space-y-1">
                                      {clamp.info.force && (
                                        <p>
                                          <span className="text-foreground">Clamping Force:</span> {clamp.info.force}
                                        </p>
                                      )}
                                      {clamp.info.feature && (
                                        <p>
                                          <span className="text-foreground">Feature:</span> {clamp.info.feature}
                                        </p>
                                      )}
                                      <p>
                                        <span className="text-foreground">Category:</span> {clamp.category}
                                      </p>
                                    </div>
                                    
                                    {/* External Link */}
                                    {clamp.info.url && (
                                      <a 
                                        href={clamp.info.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline font-tech inline-flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        View Product Details
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        );
                      })
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </div>

      {/* Placement Mode Prompt */}
      {isPlacementMode && selectedClamp && (
        <Alert className="bg-primary/10 border-primary/30">
          <MousePointer className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs font-tech">
            <span className="font-semibold text-primary">Click on part surface</span> to place the clamp.
            {selectedClamp.category === 'Toggle Clamps Vertical' && (
              <span className="block mt-1 text-muted-foreground">
                The fixture point will rest on the selected surface.
              </span>
            )}
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={handleCancelPlacement}
          >
            <X className="h-3 w-3" />
          </Button>
        </Alert>
      )}

      {/* Place Clamp Button */}
      {selectedClamp && !isPlacementMode && (
        <Button
          variant="default"
          size="sm"
          className="w-full font-tech"
          onClick={handleStartPlacement}
        >
          <Plus className="w-4 h-4 mr-2" />
          Place {selectedClamp.name}
        </Button>
      )}

      {/* Cancel Placement Button (shown during placement mode) */}
      {isPlacementMode && (
        <Button
          variant="outline"
          size="sm"
          className="w-full font-tech"
          onClick={handleCancelPlacement}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel Placement
        </Button>
      )}

      {/* Debug Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="show-debug" className="text-xs font-tech text-muted-foreground">
          Show Debug Meshes
        </Label>
        <Switch
          id="show-debug"
          checked={showDebug}
          onCheckedChange={(checked) => {
            setShowDebug(checked);
            window.dispatchEvent(new CustomEvent('clamp-toggle-debug', { detail: checked }));
          }}
        />
      </div>

      {/* Info Card */}
      <Card className="tech-glass">
        <div className="p-3 text-xs text-muted-foreground font-tech space-y-2">
          <p>
            <strong>Toggle Clamps Vertical:</strong> Apply downward clamping force, ideal for holding workpieces flat against the baseplate.
          </p>
          <p>
            <strong>Toggle Clamps Side Push:</strong> Apply horizontal clamping force, useful for pushing workpieces against stops or edges.
          </p>
          <p className="text-[10px] italic">
            Placed clamps are shown in the Properties Panel.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ClampsStepContent;
