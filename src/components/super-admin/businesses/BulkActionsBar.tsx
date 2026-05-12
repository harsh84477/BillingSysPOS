import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ban, CreditCard, Download, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  selectedCount: number;
  onClear: () => void;
  onSuspend: () => void;
  onAssignPlan: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export default function BulkActionsBar({ selectedCount, onClear, onSuspend, onAssignPlan, onExport, onDelete }: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-50 flex justify-center animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-background/95 backdrop-blur-lg shadow-2xl shadow-black/10">
        <Badge className="bg-primary text-primary-foreground text-xs px-2.5">{selectedCount} selected</Badge>
        <div className="w-px h-6 bg-border mx-1" />
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onSuspend}>
          <Ban className="h-3.5 w-3.5" />Suspend
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onAssignPlan}>
          <CreditCard className="h-3.5 w-3.5" />Assign Plan
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />Export
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />Delete
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
