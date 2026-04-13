/**
 * pages/SalesmanTargets.tsx — View assigned targets and progress
 * Shows current + past targets with progress bars
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Calendar, IndianRupee, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SalesmanTargets() {
  const { user, businessId } = useAuth();
  const today = new Date();

  const { data: settings } = useQuery({
    queryKey: ['business-settings', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('business_settings').select('currency_symbol').eq('business_id', businessId).maybeSingle();
      return data;
    },
    enabled: !!businessId,
  });
  const cs = settings?.currency_symbol || '₹';

  // ─── All targets ───
  const { data: targets = [], isLoading } = useQuery({
    queryKey: ['salesman-all-targets', user?.id, businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('salesman_targets')
        .select('*')
        .eq('business_id', businessId)
        .eq('salesman_id', user!.id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId && !!user?.id,
  });

  // ─── Bills grouped by month for achievement ───
  // Include both 'pending' and 'completed' bills for targets
  const { data: billsData = [] } = useQuery({
    queryKey: ['salesman-bills-for-targets', user?.id, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('id, total_amount, status, created_at')
        .eq('business_id', businessId)
        .eq('created_by', user!.id)
        .in('status', ['pending', 'completed'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId && !!user?.id,
  });

  // For each target, compute achieved amount and bill count
  const targetsWithProgress = targets.map((t: any) => {
    const start = parseISO(t.start_date);
    const end = parseISO(t.end_date);
    const billsInRange = billsData.filter((b: any) => {
      const d = new Date(b.created_at);
      return d >= start && d <= end;
    });
    const achieved = billsInRange.reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
    const billCount = billsInRange.length;
    const isCurrent = isWithinInterval(today, { start, end });
    const isPast = today > end;
    const amountPct = t.target_amount > 0 ? Math.min(100, (achieved / t.target_amount) * 100) : 0;
    const billPct = t.target_bills > 0 ? Math.min(100, (billCount / t.target_bills) * 100) : 0;
    return { ...t, achieved, billCount, isCurrent, isPast, amountPct, billPct };
  });

  const currentTarget = targetsWithProgress.find((t: any) => t.isCurrent);
  const pastTargets = targetsWithProgress.filter((t: any) => t.isPast);

  return (
    <div className="space-y-6 p-1">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Target className="h-5 w-5" /> My Targets</h1>
        <p className="text-sm text-muted-foreground">Track your sales targets and achievements</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : targets.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Target className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No targets assigned yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Your business owner will set targets for you.</p>
        </CardContent></Card>
      ) : (
        <>
          {/* ─── Current Target ─── */}
          {currentTarget && (
            <Card className="border-primary/30 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <Target className="h-4 w-4 text-amber-600" />
                  </div>
                  Current {currentTarget.period.charAt(0).toUpperCase() + currentTarget.period.slice(1)} Target
                  <Badge className="ml-auto">Active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(currentTarget.start_date), 'dd MMM yyyy')} – {format(parseISO(currentTarget.end_date), 'dd MMM yyyy')}
                </div>

                {/* Amount target */}
                {currentTarget.target_amount > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Sales Amount</span>
                      <span className="font-bold">
                        {cs}{currentTarget.achieved.toLocaleString('en-IN')}
                        <span className="text-muted-foreground font-normal"> / {cs}{Number(currentTarget.target_amount).toLocaleString('en-IN')}</span>
                      </span>
                    </div>
                    <Progress value={currentTarget.amountPct} className="h-4" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Remaining: {cs}{Math.max(0, currentTarget.target_amount - currentTarget.achieved).toLocaleString('en-IN')}</span>
                      <span className={cn('font-semibold', currentTarget.amountPct >= 100 ? 'text-emerald-600' : currentTarget.amountPct >= 70 ? 'text-amber-600' : 'text-rose-600')}>
                        {Math.round(currentTarget.amountPct)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Bills target */}
                {currentTarget.target_bills > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Bills Count</span>
                      <span className="font-bold">
                        {currentTarget.billCount}
                        <span className="text-muted-foreground font-normal"> / {currentTarget.target_bills}</span>
                      </span>
                    </div>
                    <Progress value={currentTarget.billPct} className="h-4" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Remaining: {Math.max(0, currentTarget.target_bills - currentTarget.billCount)}</span>
                      <span className={cn('font-semibold', currentTarget.billPct >= 100 ? 'text-emerald-600' : currentTarget.billPct >= 70 ? 'text-amber-600' : 'text-rose-600')}>
                        {Math.round(currentTarget.billPct)}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── Past Targets ─── */}
          {pastTargets.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Past Targets</h2>
              <div className="space-y-3">
                {pastTargets.map((t: any) => (
                  <Card key={t.id} className="opacity-80">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium capitalize">{t.period} Target</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {format(parseISO(t.start_date), 'dd MMM')} – {format(parseISO(t.end_date), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <Badge variant={t.amountPct >= 100 ? 'default' : 'secondary'} className="text-[10px]">
                          {t.amountPct >= 100 ? '✅ Achieved' : `${Math.round(t.amountPct)}%`}
                        </Badge>
                      </div>
                      {t.target_amount > 0 && (
                        <div className="flex items-center gap-3">
                          <Progress value={t.amountPct} className="h-2 flex-1" />
                          <span className="text-xs font-semibold whitespace-nowrap">
                            {cs}{t.achieved.toLocaleString('en-IN')} / {cs}{Number(t.target_amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      {t.target_bills > 0 && (
                        <div className="flex items-center gap-3 mt-1">
                          <Progress value={t.billPct} className="h-2 flex-1" />
                          <span className="text-xs whitespace-nowrap">{t.billCount} / {t.target_bills} bills</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
