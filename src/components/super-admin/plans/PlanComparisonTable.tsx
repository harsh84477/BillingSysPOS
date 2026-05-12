import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEATURE_CATEGORIES, PLAN_LIMIT_FIELDS } from '../planTypes';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

const PERIOD_LABELS: Record<string, string> = {
  monthly: '1 Month', '1_month': '1 Month', '3_months': '3 Months', '6_months': '6 Months',
  yearly: '1 Year', '2_years': '2 Years', '5_years': '5 Years', '10_years': '10 Years',
  lifetime: 'Lifetime', trial: 'Trial',
};

function CellValue({ value }: { value: any }) {
  if (value === true) return <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />;
  if (value === false) return <XCircle className="h-4 w-4 text-slate-300 mx-auto" />;
  if (value === -1) return <span className="text-xs font-bold text-emerald-600">Unlimited</span>;
  if (value === undefined || value === null) return <Minus className="h-4 w-4 text-slate-300 mx-auto" />;
  return <span className="text-xs font-semibold">{value}</span>;
}

interface Props { plans: any[]; }

export default function PlanComparisonTable({ plans }: Props) {
  const activePlans = plans.filter((p: any) => p.is_active);
  if (activePlans.length === 0) return null;

  return (
    <Card className="border-slate-200/70 shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Plan Comparison</CardTitle>
        <CardDescription className="text-xs">Side-by-side feature comparison of all active plans</CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="p-3 text-left text-xs font-semibold text-muted-foreground w-48 sticky left-0 bg-muted/40 z-10">Feature</th>
              {activePlans.map((plan: any) => {
                const badge = plan.features?.badge;
                return (
                  <th key={plan.id} className="p-3 text-center min-w-[140px]">
                    <div className="space-y-1">
                      {badge && <Badge className="text-[8px] mb-1 bg-violet-100 text-violet-700 border-violet-200">{badge}</Badge>}
                      <p className="font-bold text-sm">{plan.name}</p>
                      <p className="text-xs font-normal text-muted-foreground">
                        {formatCurrency(plan.price)}{plan.billing_period !== 'lifetime' ? ` / ${PERIOD_LABELS[plan.billing_period] || plan.billing_period}` : ''}
                      </p>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-muted/20"><td colSpan={activePlans.length + 1} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resource Limits</td></tr>
            {PLAN_LIMIT_FIELDS.map(field => (
              <tr key={field.key} className="border-b border-slate-100 dark:border-slate-800 hover:bg-muted/20">
                <td className="p-3 text-xs font-medium sticky left-0 bg-background z-10">{field.label}</td>
                {activePlans.map((plan: any) => (
                  <td key={plan.id} className="p-3 text-center"><CellValue value={plan.features?.[field.key]} /></td>
                ))}
              </tr>
            ))}
            {FEATURE_CATEGORIES.map(cat => (
              <React.Fragment key={cat.id}>
                <tr className="bg-muted/20"><td colSpan={activePlans.length + 1} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{cat.label}</td></tr>
                {cat.features.map(ft => (
                  <tr key={ft.key} className="border-b border-slate-100 dark:border-slate-800 hover:bg-muted/20">
                    <td className="p-3 text-xs font-medium sticky left-0 bg-background z-10">{ft.label}</td>
                    {activePlans.map((plan: any) => (
                      <td key={plan.id} className="p-3 text-center"><CellValue value={plan.features?.[ft.key]} /></td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
            <tr className="bg-muted/20"><td colSpan={activePlans.length + 1} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Support & Export</td></tr>
            <tr className="border-b border-slate-100 hover:bg-muted/20">
              <td className="p-3 text-xs font-medium sticky left-0 bg-background z-10">Support Level</td>
              {activePlans.map((plan: any) => (<td key={plan.id} className="p-3 text-center"><span className="text-xs font-semibold">{plan.features?.support || 'None'}</span></td>))}
            </tr>
            <tr className="hover:bg-muted/20">
              <td className="p-3 text-xs font-medium sticky left-0 bg-background z-10">Data Export</td>
              {activePlans.map((plan: any) => (<td key={plan.id} className="p-3 text-center"><CellValue value={plan.features?.can_export} /></td>))}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
