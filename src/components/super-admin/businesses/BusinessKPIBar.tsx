import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2, CheckCircle2, Clock, XCircle, AlertTriangle,
  IndianRupee, CreditCard, Users, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIStats {
  total: number;
  active: number;
  trial: number;
  expired: number;
  noPlan: number;
  mrr: number;
  totalSales: number;
  activeSubs: number;
}

function formatCurrency(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
}

const CARDS = [
  { key: 'total', label: 'Total Businesses', icon: Building2, color: 'text-slate-600', bg: 'bg-slate-100', ring: 'ring-slate-200' },
  { key: 'active', label: 'Active', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  { key: 'trial', label: 'Trial', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  { key: 'expired', label: 'Expired', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200' },
  { key: 'noPlan', label: 'No Plan', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  { key: 'mrr', label: 'Monthly Revenue', icon: IndianRupee, color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-200', isCurrency: true },
  { key: 'totalSales', label: 'Platform Sales', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', isCurrency: true },
  { key: 'activeSubs', label: 'Active Subs', icon: CreditCard, color: 'text-cyan-600', bg: 'bg-cyan-50', ring: 'ring-cyan-200' },
];

export default function BusinessKPIBar({ stats }: { stats: KPIStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {CARDS.map(card => {
        const val = (stats as any)[card.key] ?? 0;
        const display = card.isCurrency ? formatCurrency(val) : String(val);
        return (
          <Card key={card.key} className={cn(
            "group relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border-slate-200/60",
          )}>
            <div className={cn("absolute top-0 left-0 right-0 h-0.5", card.bg)} />
            <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", card.bg)}>
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
              <p className="text-lg font-black tracking-tight leading-none">{display}</p>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">{card.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
