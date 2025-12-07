import React, { useCallback } from 'react';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Grid3X3, Square, Hexagon, Trash2, Maximize2, Move } from 'lucide-react';

interface BaseplateConfig {
  id: string;
  type: string;
  padding?: number;
  height?: number;
}

interface BaseplateAccordionProps {
  baseplate: BaseplateConfig | null;
  onRemoveBaseplate?: () => void;
  onUpdateBaseplate?: (updates: Partial<BaseplateConfig>) => void;
}

const BaseplateAccordion: React.FC<BaseplateAccordionProps> = ({
  baseplate,
  onRemoveBaseplate,
  onUpdateBaseplate,
}) => {
  // Handle property changes
  const handlePropertyChange = useCallback((property: 'padding' | 'height', value: number) => {
    if (!baseplate || !onUpdateBaseplate) return;
    onUpdateBaseplate({ [property]: value });
  }, [baseplate, onUpdateBaseplate]);

  // Empty state - no baseplate
  if (!baseplate) {
    return (
      <AccordionItem value="baseplate" className="border-border/50">
        <AccordionTrigger className="py-2 text-xs font-tech hover:no-underline">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-3.5 h-3.5 text-primary" />
            Baseplate
            <Badge variant="secondary" className="ml-auto font-tech text-[8px] h-4">
              None
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2">
          <div className="tech-glass p-4 text-center rounded-md border border-border/30">
            <Grid3X3 className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground font-tech">
              No baseplate configured
            </p>
            <p className="text-[10px] text-muted-foreground font-tech mt-1">
              Use the Baseplates step in the Context Panel to add a baseplate
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  }

  const TypeIcon = baseplate.type === 'convex-hull' ? Hexagon : Square;

  return (
    <AccordionItem value="baseplate" className="border-border/50">
      <AccordionTrigger className="py-2 text-xs font-tech hover:no-underline">
        <div className="flex items-center gap-2 flex-1">
          <Grid3X3 className="w-3.5 h-3.5 text-primary" />
          Baseplate
          <Badge variant="default" className="ml-auto font-tech text-[8px] h-4 bg-green-500/20 text-green-600 border-green-500/30">
            Active
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-2">
        <div className="space-y-1">
          {/* Sub-accordion item for baseplate */}
          <div className="border rounded-md transition-all border-primary bg-primary/5">
            {/* Header row */}
            <div className="py-1.5 px-2 flex items-center gap-2 border-b border-border/30">
              <div className="w-5 h-5 rounded bg-muted/50 flex items-center justify-center">
                <TypeIcon className="w-3 h-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-tech font-medium capitalize">
                  {baseplate.type === 'convex-hull' ? 'Convex Hull' : 'Rectangular'}
                </p>
              </div>
              {onRemoveBaseplate && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onRemoveBaseplate();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      e.preventDefault();
                      onRemoveBaseplate();
                    }
                  }}
                  className="w-6 h-6 p-0 flex items-center justify-center rounded text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  title="Remove baseplate"
                >
                  <Trash2 className="w-3 h-3" />
                </div>
              )}
            </div>
            
            {/* Properties */}
            <div className="p-2 space-y-3">
              {/* Padding */}
              <div className="space-y-2">
                <Label className="text-[8px] font-tech text-muted-foreground flex items-center gap-1">
                  <Move className="w-2.5 h-2.5" />
                  Padding (mm)
                </Label>
                <Input
                  type="number"
                  value={baseplate.padding?.toFixed(0) ?? '10'}
                  onChange={(e) => handlePropertyChange('padding', parseFloat(e.target.value) || 0)}
                  className="h-6 !text-[10px] font-mono"
                  step="1"
                  min="0"
                  max="100"
                />
                <p className="text-[8px] text-muted-foreground font-tech">
                  Extra space around the workpiece boundary
                </p>
              </div>

              {/* Height */}
              <div className="space-y-2">
                <Label className="text-[8px] font-tech text-muted-foreground flex items-center gap-1">
                  <Maximize2 className="w-2.5 h-2.5" />
                  Height (mm)
                </Label>
                <Input
                  type="number"
                  value={baseplate.height?.toFixed(0) ?? '4'}
                  onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value) || 1)}
                  className="h-6 !text-[10px] font-mono"
                  step="1"
                  min="1"
                  max="100"
                />
                <p className="text-[8px] text-muted-foreground font-tech">
                  Thickness of the baseplate
                </p>
              </div>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default BaseplateAccordion;
