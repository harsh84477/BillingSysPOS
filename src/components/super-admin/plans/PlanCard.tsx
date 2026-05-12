import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Crown, Edit2, Copy, Trash2, Archive, ToggleLeft, ToggleRight,
  Users, Package, FileSpreadsheet, Clock, Building2, MoreVertical,
  CheckCircle2, HeadphonesIcon, Sparkles, Zap, HardDrive,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plan, PlanFeatures, PERIOD_LABELS, PERIOD_SHORT,
  formatCurrency, getPlanColor, getBadgeConfig,
  FEATURE_CATEGORIES,
} from '../planTypes';

const LIMIT_ICONS: Record<string, React.ElementType> = {
  max_users: Users, max_products: Package, max_branches: Building2,
  max_bills_per_day: FileSpreadsheet, history_days: Clock,
  max_storage_gb: HardDrive,
};

interface PlanCardProps {
  plan: Plan;
  subscriberCount: number;
  onEdit: (plan: Plan) => void;
  onDuplicate: (plan: Plan) => void;
  onToggleActive: (plan: Plan) => void;
  onArchive: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}

export default function PlanCard({
  plan, subscriberCount, onEdit, onDuplicate, onToggleActive, onArchive, onDelete,
}: PlanCardProps) {
  const f = plan.features || {};
  const color = getPlanColor(f.accent_color);
  const badge = getBadgeConfig(f.badge);
  const enabledFeatures = FEATURE_CATEGORIES.flatMap(c =>
    c.features.filter(ft => (f as any)[ft.key])
  );

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-xl group border-slate-200/60",
      !plan.is_active && "opacity-55 grayscale-[40%]",
      badge.value && `ring-2 ${color.ring} ${color.border}`,
    )}>
      {/* Gradient accent strip */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", color.gradient)} />

      {/* Badge */}
      {badge.value && (
        <div className="absolute top-3 right-3">
          <Badge className={cn(
            "text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 border",
            `bg-${badge.color}-100 text-${badge.color}-700 border-${badge.color}-200`
          )}>
            {badge.label}
          </Badge>
        </div>
      )}

      {!plan.is_active && !badge.value && (
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
        </div>
      )}

      <CardHeader className="pb-2 pt-5">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", color.bg)}>
            <Crown className={cn("h-5 w-5", color.text)} />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{plan.name}</CardTitle>
            <CardDescription className="text-[11px]">
              {PERIOD_LABELS[plan.billing_period] || plan.billing_period}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black tracking-tight">{formatCurrency(plan.price)}</span>
          <span className="text-sm text-muted-foreground">{PERIOD_SHORT[plan.billing_period] || ''}</span>
        </div>

        {plan.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
        )}

        {/* Subscriber count */}
        <div className="flex items-center gap-1.5 text-xs">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{subscriberCount} active subscriber{subscriberCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Limits grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {(['max_users', 'max_products', 'max_bills_per_day', 'max_branches'] as const).map(key => {
            const Icon = LIMIT_ICONS[key] || Package;
            const val = (f as any)[key];
            const display = val === -1 || val === undefined ? '∞' : String(val);
            const labels: Record<string, string> = {
              max_users: 'Users', max_products: 'Products',
              max_bills_per_day: 'Bills/day', max_branches: 'Branches',
            };
            return (
              <div key={key} className="flex items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 text-[11px]">
                <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{labels[key]}:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{display}</span>
              </div>
            );
          })}
        </div>

        {/* Feature flags */}
        <div className="flex flex-wrap gap-1">
          {f.can_export && (
            <Badge variant="outline" className="text-[9px] gap-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="h-2.5 w-2.5" />Export
            </Badge>
          )}
          {f.support && f.support !== 'None' && (
            <Badge variant="outline" className="text-[9px] gap-0.5 bg-blue-50 text-blue-700 border-blue-200">
              <HeadphonesIcon className="h-2.5 w-2.5" />{f.support}
            </Badge>
          )}
          {enabledFeatures.slice(0, 3).map(ft => (
            <Badge key={ft.key} variant="outline" className="text-[9px] gap-0.5 bg-violet-50 text-violet-700 border-violet-200">
              <Sparkles className="h-2.5 w-2.5" />{ft.label}
            </Badge>
          ))}
          {enabledFeatures.length > 3 && (
            <Badge variant="outline" className="text-[9px] text-muted-foreground">
              +{enabledFeatures.length - 3} more
            </Badge>
          )}
        </div>

        {/* Feature list */}
        {f.feature_list && f.feature_list.length > 0 && (
          <ul className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3">
            {f.feature_list.slice(0, 4).map((feat, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
            {f.feature_list.length > 4 && (
              <li className="text-[10px] text-muted-foreground/60 ml-5">+{f.feature_list.length - 4} more</li>
            )}
          </ul>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => onEdit(plan)}>
            <Edit2 className="h-3 w-3" />Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onDuplicate(plan)} className="gap-2 text-xs">
                <Copy className="h-3.5 w-3.5" />Duplicate Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(plan)} className="gap-2 text-xs">
                {plan.is_active
                  ? <><ToggleLeft className="h-3.5 w-3.5" />Deactivate</>
                  : <><ToggleRight className="h-3.5 w-3.5" />Activate</>
                }
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive(plan)} className="gap-2 text-xs">
                <Archive className="h-3.5 w-3.5" />Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(plan)} className="gap-2 text-xs text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />Delete Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
