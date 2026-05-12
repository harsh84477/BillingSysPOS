import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Zap, Loader2, Receipt, Package, Users, BarChart3, Sparkles, Infinity } from 'lucide-react';
import {
  PlanFormState, DURATION_OPTIONS, BADGE_OPTIONS, PLAN_COLORS,
  FEATURE_CATEGORIES, PLAN_LIMIT_FIELDS,
} from '../planTypes';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  billing: Receipt, inventory: Package, team: Users, analytics: BarChart3, premium: Sparkles,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: PlanFormState;
  setForm: React.Dispatch<React.SetStateAction<PlanFormState>>;
  isEditing: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export default function PlanBuilderModal({ open, onOpenChange, form, setForm, isEditing, isSaving, onSave }: Props) {
  const updateField = <K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));
  const toggleFeature = (key: string) =>
    setForm(prev => ({ ...prev, features: { ...prev.features, [key]: !prev.features[key] } }));
  const setLimit = (key: string, val: number) =>
    setForm(prev => ({ ...prev, limits: { ...prev.limits, [key]: val } }));
  const toggleUnlimited = (key: string) =>
    setForm(prev => ({ ...prev, unlimited: { ...prev.unlimited, [key]: !prev.unlimited[key] } }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            {isEditing ? 'Edit Plan' : 'Create New Plan'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update plan details and features.' : 'Build a new subscription tier.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
            <TabsTrigger value="features" className="text-xs">Features</TabsTrigger>
            <TabsTrigger value="limits" className="text-xs">Limits</TabsTrigger>
            <TabsTrigger value="display" className="text-xs">Display</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Plan Name *</Label>
              <Input placeholder="e.g. Starter, Pro, Enterprise" value={form.name} onChange={e => updateField('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Description</Label>
              <Input placeholder="Short description" value={form.description} onChange={e => updateField('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Price (₹)</Label>
                <Input type="number" placeholder="299" value={form.price || ''} onChange={e => updateField('price', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Billing Period</Label>
                <Select value={form.billing_period} onValueChange={v => updateField('billing_period', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.billing_period === 'custom' && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Custom Duration (Days)</Label>
                <Input type="number" placeholder="90" value={form.custom_duration_days || ''} onChange={e => updateField('custom_duration_days', Number(e.target.value))} />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Support Level</Label>
              <Select value={form.support} onValueChange={v => updateField('support', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Priority">Priority</SelectItem>
                  <SelectItem value="24/7 Priority">24/7 Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div><Label className="text-sm font-medium">Active</Label><p className="text-[11px] text-muted-foreground">Visible to businesses</p></div>
              <Switch checked={form.is_active} onCheckedChange={v => updateField('is_active', v)} />
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4 mt-4">
            {FEATURE_CATEGORIES.map(cat => {
              const Icon = CATEGORY_ICONS[cat.id] || Sparkles;
              return (
                <div key={cat.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold">{cat.label}</h4></div>
                  <div className="space-y-2">
                    {cat.features.map(ft => (
                      <div key={ft.key} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                        <div><p className="text-sm font-medium">{ft.label}</p>{ft.description && <p className="text-[11px] text-muted-foreground">{ft.description}</p>}</div>
                        <Switch checked={!!form.features[ft.key]} onCheckedChange={() => toggleFeature(ft.key)} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Additional Features (one per line)</Label>
              <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={"Unlimited billing\nInventory tracking"} value={form.feature_list_text} onChange={e => updateField('feature_list_text', e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="limits" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground mb-2">Set resource limits. Toggle for unlimited.</p>
            {PLAN_LIMIT_FIELDS.map(field => (
              <div key={field.key} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <div className="flex-1"><Label className="text-sm font-medium">{field.label}</Label></div>
                <div className="flex items-center gap-2">
                  {form.unlimited[field.key] ? (
                    <Badge variant="outline" className="text-xs gap-1 bg-emerald-50 text-emerald-700 border-emerald-200"><Infinity className="h-3 w-3" />Unlimited</Badge>
                  ) : (
                    <Input type="number" className="w-24 h-8 text-sm" value={form.limits[field.key] ?? ''} onChange={e => setLimit(field.key, Number(e.target.value))} />
                  )}
                  <Switch checked={!!form.unlimited[field.key]} onCheckedChange={() => toggleUnlimited(field.key)} />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="display" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Plan Badge</Label>
              <Select value={form.badge || '_none'} onValueChange={v => updateField('badge', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="No badge" /></SelectTrigger>
                <SelectContent>
                  {BADGE_OPTIONS.map(b => <SelectItem key={b.value || '_none'} value={b.value || '_none'}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Accent Color</Label>
              <div className="flex flex-wrap gap-2">
                {PLAN_COLORS.map(c => (
                  <button key={c.value} type="button" title={c.label}
                    className={cn("h-9 w-9 rounded-lg border-2 transition-all flex items-center justify-center", c.bg,
                      form.accent_color === c.value ? `${c.border} ring-2 ${c.ring} scale-110` : "border-transparent hover:scale-105")}
                    onClick={() => updateField('accent_color', c.value)}>
                    <div className={cn("h-4 w-4 rounded-full", `bg-${c.value}-500`)} />
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? 'Update Plan' : 'Create Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
