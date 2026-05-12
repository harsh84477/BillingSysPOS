import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Check, X, CreditCard, Sparkles, Clock, AlertTriangle, Crown,
  Users, Package, FileSpreadsheet, Building2, Shield, Zap,
  ArrowRight, CheckCircle2, XCircle, Minus, Star,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

const FEATURE_ROWS = [
  { key: 'max_users', label: 'Max Users', icon: Users },
  { key: 'max_products', label: 'Max Products', icon: Package },
  { key: 'max_bills_per_day', label: 'Bills Per Day', icon: FileSpreadsheet },
  { key: 'max_branches', label: 'Max Branches', icon: Building2 },
  { key: 'gst_billing', label: 'GST Billing', icon: Shield },
  { key: 'e_invoice', label: 'E-Invoice', icon: FileSpreadsheet },
  { key: 'thermal_printing', label: 'Thermal Printing', icon: FileSpreadsheet },
  { key: 'barcode_support', label: 'Barcode Support', icon: Package },
  { key: 'bulk_import_export', label: 'Data Export', icon: FileSpreadsheet },
  { key: 'allow_managers', label: 'Manager Roles', icon: Users },
  { key: 'allow_cashiers', label: 'Cashier Roles', icon: Users },
  { key: 'allow_salesmen', label: 'Salesman Roles', icon: Users },
  { key: 'profit_reports', label: 'Profit Reports', icon: Sparkles },
  { key: 'sales_analytics', label: 'Sales Analytics', icon: Sparkles },
  { key: 'whatsapp_integration', label: 'WhatsApp Integration', icon: Zap },
  { key: 'api_access', label: 'API Access', icon: Zap },
  { key: 'custom_branding', label: 'Custom Branding', icon: Crown },
  { key: 'support', label: 'Support Level', icon: Shield },
];

function CellValue({ value }: { value: any }) {
  if (value === true) return <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />;
  if (value === false || value === undefined || value === null) return <XCircle className="h-4 w-4 text-slate-300 mx-auto" />;
  if (value === -1) return <span className="text-xs font-bold text-emerald-600">Unlimited</span>;
  if (typeof value === 'string') return <span className="text-xs font-semibold">{value}</span>;
  return <span className="text-xs font-semibold">{value}</span>;
}

export default function SubscriptionManagement() {
  const { isAdmin } = useAuth();
  const {
    subscription, planName, isTrial, isActive, isExpired,
    isFreeLifetime, historyLimitDays, canExport,
    maxBillsPerDay, maxItemsPerDay, status,
  } = useSubscription();

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price');
      if (error) throw error;
      return data;
    },
  });

  const handleUpgrade = (plan: any) => {
    toast.info(`To upgrade to ${plan.name}, please contact our sales team or system admin.`);
  };

  const getStatusConfig = () => {
    if (isTrial) return { label: 'TRIAL', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock };
    if (isFreeLifetime) return { label: 'LIFETIME', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Crown };
    if (isExpired) return { label: 'EXPIRED', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle };
    if (isActive) return { label: 'ACTIVE', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
    return { label: 'NONE', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Minus };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Expiry countdown
  const expiryDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : subscription?.trial_end ? new Date(subscription.trial_end) : null;
  const daysLeft = expiryDate ? differenceInDays(expiryDate, new Date()) : null;

  // Current plan from DB
  const currentDbPlan = plans.find((p: any) => p.name === subscription?.plan?.name);

  return (
    <div className="space-y-8">
      {/* ── Hero Card ── */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <Crown className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-white/50 font-semibold uppercase tracking-widest">Current Plan</p>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {(() => {
                      if (isTrial) return 'Free Trial';
                      if (isFreeLifetime) return 'Lifetime';
                      if (subscription?.plan?.name) return subscription.plan.name;
                      if (status === 'active') return 'Active Plan';
                      return 'No Plan';
                    })()}
                  </h2>
                </div>
              </div>

              <Badge className={cn("text-xs gap-1.5 px-3 py-1", statusConfig.color)}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConfig.label}
              </Badge>

              {/* Usage meters */}
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <UsageMeter label="Bills/Day" used={0} max={maxBillsPerDay} />
                <UsageMeter label="Items/Day" used={0} max={maxItemsPerDay} />
              </div>
            </div>

            {/* Right side - expiry */}
            <div className="text-right space-y-3 shrink-0">
              {expiryDate && !isFreeLifetime && (
                <>
                  <div>
                    <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">
                      {isTrial ? 'Trial Ends' : 'Expires'}
                    </p>
                    <p className="text-lg font-bold">{format(expiryDate, 'MMM dd, yyyy')}</p>
                  </div>
                  {daysLeft !== null && (
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold",
                      daysLeft <= 7 ? "bg-red-500/20 text-red-300" :
                      daysLeft <= 30 ? "bg-amber-500/20 text-amber-300" :
                      "bg-emerald-500/20 text-emerald-300"
                    )}>
                      <Clock className="h-3 w-3" />
                      {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                    </div>
                  )}
                </>
              )}
              {isFreeLifetime && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                  <Sparkles className="h-3 w-3" />Never expires
                </div>
              )}
              <div className="mt-3">
                <p className="text-xs text-white/40">
                  Export: <span className={canExport ? "text-emerald-400" : "text-red-400"}>{canExport ? 'Unlocked' : 'Locked'}</span>
                  <span className="mx-2 text-white/20">|</span>
                  History: <span className="text-white/80">
                    {historyLimitDays === -1 ? 'Unlimited' : `${historyLimitDays}d`}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isExpired && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-200">Your subscription has expired</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              Bill creation and full history access are restricted. Please upgrade to resume operations.
            </p>
          </div>
        </div>
      )}

      {/* ── Comparison Table ── */}
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />Compare Plans
          </CardTitle>
          <CardDescription>See what each plan offers and choose the best for your business</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground w-44 sticky left-0 bg-muted/40 z-10">Feature</th>
                {plans.map((plan: any) => {
                  const isCurrent = plan.name === subscription?.plan?.name;
                  const badge = plan.features?.badge;
                  return (
                    <th key={plan.id} className={cn("p-3 text-center min-w-[130px]", isCurrent && "bg-primary/5")}>
                      <div className="space-y-1">
                        {badge && (
                          <Badge className="text-[8px] mb-1 bg-violet-100 text-violet-700 border-violet-200">
                            {badge === 'popular' ? 'Popular' : badge === 'best_value' ? 'Best Value' : badge === 'recommended' ? 'Recommended' : badge}
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge className="text-[8px] mb-1 bg-emerald-100 text-emerald-700 border-emerald-200">Current</Badge>
                        )}
                        <p className="font-bold text-sm">{plan.name}</p>
                        <p className="text-xs font-normal text-muted-foreground">
                          {plan.price > 0 ? formatCurrency(plan.price) : 'Free'}
                          {plan.billing_period !== 'lifetime' && plan.billing_period !== 'free' && plan.price > 0
                            ? ` / ${plan.billing_period.replace('_', ' ')}` : ''}
                        </p>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map(row => (
                <tr key={row.key} className="border-b border-slate-100 dark:border-slate-800 hover:bg-muted/20 transition-colors">
                  <td className="p-3 text-xs font-medium sticky left-0 bg-background z-10 flex items-center gap-2">
                    <row.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {row.label}
                  </td>
                  {plans.map((plan: any) => {
                    const isCurrent = plan.name === subscription?.plan?.name;
                    return (
                      <td key={plan.id} className={cn("p-3 text-center", isCurrent && "bg-primary/5")}>
                        <CellValue value={plan.features?.[row.key]} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Upgrade Cards ── */}
      {isAdmin && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />Upgrade Options
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan: any) => {
              const isCurrent = plan.name === subscription?.plan?.name;
              const badge = plan.features?.badge;
              const isHighlighted = badge === 'popular' || badge === 'best_value' || badge === 'recommended';

              return (
                <Card key={plan.id} className={cn(
                  "flex flex-col relative overflow-hidden transition-all hover:shadow-lg",
                  isHighlighted && "border-primary shadow-md ring-1 ring-primary/20",
                  isCurrent && "border-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/10"
                )}>
                  {isHighlighted && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-blue-500" />
                  )}
                  {badge && (
                    <div className="absolute -top-0 right-3">
                      <Badge className="rounded-t-none rounded-b-lg text-[9px] font-bold bg-primary text-primary-foreground">
                        {badge === 'popular' ? '⭐ Popular' : badge === 'best_value' ? '🏆 Best Value' : badge === 'recommended' ? '👍 Recommended' : badge}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-black tracking-tight">
                        {plan.price > 0 ? formatCurrency(plan.price) : 'Free'}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-sm text-muted-foreground capitalize">
                          / {plan.billing_period.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    {plan.description && (
                      <CardDescription className="mt-2 text-xs">{plan.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2 text-sm">
                      {(plan.features?.feature_list || []).slice(0, 5).map((feat: string, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                      {plan.features?.can_export && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>Data Export</span>
                        </li>
                      )}
                      {plan.features?.support && plan.features.support !== 'None' && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{plan.features.support} Support</span>
                        </li>
                      )}
                    </ul>
                  </CardContent>
                  <div className="p-6 pt-0 mt-auto">
                    <Button className="w-full" variant={isCurrent ? 'secondary' : isHighlighted ? 'default' : 'outline'}
                      disabled={isCurrent} onClick={() => handleUpgrade(plan)}>
                      {isCurrent ? '✓ Current Plan' : `Choose ${plan.name}`}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground pt-4">
        Need a custom plan for multiple branches?{' '}
        <Button variant="link" className="h-auto p-0 text-xs text-primary">Contact Sales</Button>
      </p>
    </div>
  );
}

// ── Usage Meter sub-component ──
function UsageMeter({ label, used, max }: { label: string; used: number; max?: number }) {
  const isUnlimited = !max || max === -1;
  const percentage = isUnlimited ? 5 : Math.min((used / max) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/50 font-medium">{label}</span>
        <span className="text-[11px] text-white/70 font-bold">
          {isUnlimited ? 'Unlimited' : `${used}/${max}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isUnlimited ? "bg-emerald-400/50 w-full" :
            percentage > 80 ? "bg-red-400" :
            percentage > 50 ? "bg-amber-400" : "bg-emerald-400"
          )}
          style={isUnlimited ? {} : { width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
