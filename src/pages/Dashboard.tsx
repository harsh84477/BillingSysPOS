import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  Users,
  Download,
  ChevronRight,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { exportToExcel, exportDayWiseSummary, exportStyledExcel } from '@/lib/exportToExcel';
import type { ExcelTableDef, ExcelSummaryDef } from '@/lib/exportToExcel';
import { cn } from '@/lib/utils';
import DraftBillModal from '@/components/bills/DraftBillModal';
import { useExpenseTracking } from '@/hooks/useBillingSystem';
import { Wallet, Smartphone, CreditCard, Plus, UserPlus, Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import DisplayNamePrompt from '@/components/auth/DisplayNamePrompt';

type KPIColor = 'blue' | 'green' | 'amber' | 'red';

const KPI_THEME: Record<KPIColor, { lightBg: string; grad: string; textColor: string }> = {
  green: { lightBg: 'bg-emerald-50 dark:bg-emerald-950/20', grad: 'from-emerald-500 to-green-600',   textColor: 'text-emerald-600' },
  blue:  { lightBg: 'bg-indigo-50  dark:bg-indigo-950/20',  grad: 'from-indigo-500 to-blue-600',    textColor: 'text-indigo-600' },
  amber: { lightBg: 'bg-amber-50   dark:bg-amber-950/20',   grad: 'from-amber-500  to-orange-500',  textColor: 'text-amber-600' },
  red:   { lightBg: 'bg-rose-50    dark:bg-rose-950/20',    grad: 'from-rose-500   to-pink-600',    textColor: 'text-rose-600' },
};

function KPICard({
  title,
  value,
  icon: Icon,
  description,
  isLoading,
  color = 'blue',
  index = 0,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
  color?: KPIColor;
  index?: number;
  onClick?: () => void;
}) {
  const theme = KPI_THEME[color];
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 relative overflow-hidden group transition-all duration-200',
        theme.lightBg,
        onClick && 'cursor-pointer hover:shadow-md active:scale-[0.98]'
      )}
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={onClick}
    >
      {/* Decorative gradient circle */}
      <div className={cn('absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity', theme.grad)} />
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight pr-2">{title}</p>
          <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md shrink-0', theme.grad)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-7 w-24 mt-1" />
        ) : (
          <>
            <p className={cn('text-xl sm:text-2xl font-black leading-none', theme.textColor)}>{value}</p>
            {description && <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">{description}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isSuperAdmin, isSalesman, userRole, isAdmin, isManager, businessId } = useAuth();
  const navigate = useNavigate();
  const [selectedDraftBillId, setSelectedDraftBillId] = useState<string | null>(null);
  const { profitSummary, isSummaryLoading } = useExpenseTracking(businessId);

  // Display name state
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);

  // Fetch display name from profiles table
  const { data: profileData } = useQuery({
    queryKey: ['profileDisplayName', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  React.useEffect(() => {
    if (profileData !== undefined) {
      if (profileData?.display_name) {
        setProfileDisplayName(profileData.display_name);
      } else if (user) {
        // No display name set — show prompt
        setShowNamePrompt(true);
      }
    }
  }, [profileData, user]);

  React.useEffect(() => {
    if (!user && isSuperAdmin) {
      navigate('/super-admin');
    }
  }, [user, isSuperAdmin, navigate]);

  const today = useMemo(() => new Date(), []);
  const startOfToday = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );
  const startOfThisMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today]
  );

  // Month selector for expense report
  const [selectedMonth, setSelectedMonth] = useState(() => format(today, 'yyyy-MM'));

  // Generate last 12 months for dropdown
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(today, i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  // Fetch today's sales
  const { data: todaySales, isLoading: loadingTodaySales } = useQuery({
    queryKey: ['todaySales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('completed_at', startOfToday.toISOString());

      if (error) throw error;
      return data?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0;
    },
  });

  // Fetch monthly stats (Sales, Profit, Orders, Due)
  const { data: monthlyStats, isLoading: loadingMonthlyStats } = useQuery({
    queryKey: ['monthlyStats', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('*, customers(name)')
        .eq('status', 'completed')
        .gte('completed_at', startOfThisMonth.toISOString());

      if (error) throw error;
      const bills = (data || []) as any[];
      const dueBillsList = bills.filter(b => b.payment_status === 'unpaid' || b.payment_status === 'partial');
      return {
        revenue: bills.reduce((sum, bill) => sum + Number(bill.total_amount || 0), 0),
        profit: bills.reduce((sum, bill) => sum + Number(bill.profit || 0), 0),
        dueAmount: bills.reduce((sum, bill) => sum + (bill.payment_status === 'unpaid' || bill.payment_status === 'partial' ? Number(bill.due_amount || 0) : 0), 0),
        orders: bills.length,
        dueBillsList,
      };
    },
    enabled: !!businessId,
  });

  // Fetch monthly payments and due collection
  const { data: monthlyPayments, isLoading: loadingMonthlyPayments } = useQuery({
    queryKey: ['monthlyPayments', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bill_payments' as any)
        .select('amount, payment_mode, notes, created_at, bills!inner(bill_number, created_at, total_amount, due_amount, customers(name))')
        .eq('business_id', businessId)
        .gte('created_at', startOfThisMonth.toISOString());

      let dueCollectionSum = 0;
      const dueCollectionList: any[] = [];
      if (!error && data) {
        data.forEach((p: any) => {
          if (p.notes === 'due_bill' || new Date(p.bills.created_at).getTime() < startOfThisMonth.getTime()) {
            dueCollectionSum += Number(p.amount || 0);
            dueCollectionList.push(p);
          }
        });
      }
      return { dueCollectionSum, dueCollectionList };
    },
    enabled: !!businessId,
  });

  const [activeModalData, setActiveModalData] = useState<{ type: 'dueBills' | 'dueCollections', title: string, data: any[] } | null>(null);

  // Fetch today's complete stats from bills
  const { data: todayStats, isLoading: loadingTodayStats } = useQuery({
    queryKey: ['todayStats', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('*, customers(name, phone)')
        .eq('status', 'completed')
        .gte('completed_at', startOfToday.toISOString());

      if (error) throw error;
      const bills = (data || []) as any[];
      const dueBillsList = bills.filter((b: any) => b.payment_status === 'unpaid' || b.payment_status === 'partial');
      return {
        sales: bills.reduce((sum, b: any) => sum + Number(b.total_amount || 0), 0),
        profit: bills.reduce((sum, b: any) => sum + Number(b.profit || 0), 0),
        dueAmount: bills.reduce((sum, b: any) => sum + (b.payment_status === 'unpaid' || b.payment_status === 'partial' ? Number(b.due_amount || 0) : 0), 0),
        orders: bills.length,
        dueBillsList,
      };
    },
    enabled: !!businessId,
  });

  // Fetch today's payments and due collection
  const { data: todayPayments, isLoading: loadingTodayPayments } = useQuery({
    queryKey: ['todayPayments', businessId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('bill_payments' as any)
        .select('amount, payment_mode, notes, created_at, bills!inner(bill_number, created_at, total_amount, due_amount, customers(name))')
        .eq('business_id', businessId)
        .gte('created_at', startOfToday.toISOString()) as any);

      let cash = 0;
      let online = 0;
      let dueCollectionSum = 0;
      const dueCollectionList: any[] = [];

      if (!error && data) {
        data.forEach((p: any) => {
          if (p.payment_mode === 'cash') cash += Number(p.amount || 0);
          else if (p.payment_mode === 'upi' || p.payment_mode === 'card') online += Number(p.amount || 0);

          if (p.notes === 'due_bill' || new Date(p.bills.created_at).getTime() < startOfToday.getTime()) {
            dueCollectionSum += Number(p.amount || 0);
            dueCollectionList.push(p);
          }
        });
      }
      return { cash, online, dueCollectionSum, dueCollectionList };
    },
    enabled: !!businessId,
  });

  // Fetch pending bills
  const { data: pendingBills, isLoading: loadingPending } = useQuery({
    queryKey: ['pendingBills'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');

      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch draft bills (visible to all, but salesman sees own only)
  const { data: draftBills = [], isLoading: loadingDrafts } = useQuery({
    queryKey: ['draftBills', user?.id, userRole],
    queryFn: async () => {
      let query = supabase
        .from('bills')
        .select('id, bill_number, total_amount, salesman_name, created_by, created_at, customers(name, phone, address)')
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(20);

      // Salesman can only see their own drafts
      if (isSalesman && user?.id) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query as any;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch low stock products
  const { data: lowStockProducts, isLoading: loadingLowStock } = useQuery({
    queryKey: ['lowStockProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold')
        .eq('is_active', true);

      if (error) throw error;
      return data?.filter(p => p.stock_quantity <= p.low_stock_threshold) || [];
    },
  });

  // Fetch total reserved units
  const { data: totalReserved = 0, isLoading: loadingReserved } = useQuery({
    queryKey: ['reservedStockUnits'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('products')
        .select('reserved_quantity')
        .gt('reserved_quantity', 0) as any);
      if (error) throw error;
      return (data || []).reduce((sum: number, p: any) => sum + (p.reserved_quantity || 0), 0) || 0;
    },
  });

  // Fetch recent bills
  const { data: recentBills, isLoading: loadingRecent } = useQuery({
    queryKey: ['recentBills'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('bills')
        .select(`
          id,
          bill_number,
          total_amount,
          status,
          created_at,
          payment_status,
          customers (name, phone, address)
        `)
        .order('created_at', { ascending: false })
        .limit(10) as any);

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch due stats
  const { data: dueStats, isLoading: loadingDue } = useQuery({
    queryKey: ['dueStats'],
    queryFn: async () => {
      const { data, error } = await ((supabase
        .from('bills') as any)
        .select('due_amount, due_date, payment_status')
        .in('payment_status', ['unpaid', 'partial'])
        .eq('status', 'completed') as any);
      if (error) throw error;
      const bills = (data || []) as any[];
      const today = new Date();
      return {
        totalDue: bills.reduce((s: number, b: any) => s + Number(b.due_amount || 0), 0),
        unpaidCount: bills.length,
        overdueCount: bills.filter((b: any) => b.due_date && new Date(b.due_date) < today).length,
      };
    },
  });

  // Fetch today's profit
  const { data: todayProfit, isLoading: loadingTodayProfit } = useQuery({
    queryKey: ['todayProfit'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('bills')
        .select('profit')
        .eq('status', 'completed')
        .gte('completed_at', startOfToday.toISOString()) as any);
      if (error) throw error;
      return ((data || []) as any[]).reduce((s: number, b: any) => s + Number(b.profit || 0), 0);
    },
  });

  // Fetch customer count
  const { data: customerCount, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customerCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch total inventory value
  const { data: inventoryValue, isLoading: loadingInventoryValue } = useQuery({
    queryKey: ['inventoryValue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('stock_quantity, cost_price')
        .eq('is_active', true);

      if (error) throw error;
      return data?.reduce((sum, p) => sum + (Number(p.stock_quantity) * Number(p.cost_price)), 0) || 0;
    },
  });

  // Fetch business settings for currency
  const { data: settings } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('currency_symbol')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch monthly expense report data
  const { data: monthlyExpenseData, isLoading: loadingExpense } = useQuery({
    queryKey: ['monthlyExpense', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));

      const { data, error } = await supabase
        .from('bills')
        .select(`
          id,
          bill_number,
          total_amount,
          subtotal,
          discount_amount,
          tax_amount,
          status,
          created_at,
          completed_at,
          customers (name, phone, address)
        `)
        .eq('status', 'completed')
        .gte('completed_at', monthStart.toISOString())
        .lte('completed_at', monthEnd.toISOString())
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch cost data for profit calculation
  const { data: monthlyCostData } = useQuery({
    queryKey: ['monthlyCost', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));

      // Get all bill items with cost for completed bills in this month
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('id')
        .eq('status', 'completed')
        .gte('completed_at', monthStart.toISOString())
        .lte('completed_at', monthEnd.toISOString());

      if (billsError) throw billsError;

      if (!bills || bills.length === 0) return 0;

      const billIds = bills.map(b => b.id);
      const { data: items, error } = await supabase
        .from('bill_items')
        .select('cost_price, quantity')
        .in('bill_id', billIds);

      if (error) throw error;
      return items?.reduce((sum, item) => sum + (Number(item.cost_price) * item.quantity), 0) || 0;
    },
  });

  const currencySymbol = settings?.currency_symbol || '$';

  const monthlyTotals = {
    revenue: monthlyExpenseData?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0,
    subtotal: monthlyExpenseData?.reduce((sum, b) => sum + Number(b.subtotal), 0) || 0,
    discounts: monthlyExpenseData?.reduce((sum, b) => sum + Number(b.discount_amount), 0) || 0,
    tax: monthlyExpenseData?.reduce((sum, b) => sum + Number(b.tax_amount), 0) || 0,
    cost: monthlyCostData || 0,
    profit: (monthlyExpenseData?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0) - (monthlyCostData || 0),
    orderCount: monthlyExpenseData?.length || 0,
  };

  const handleExportMonthlyReport = () => {
    if (!monthlyExpenseData || monthlyExpenseData.length === 0) {
      toast.error('No data to export for this month');
      return;
    }

    // Export detailed bill data
    exportToExcel(
      monthlyExpenseData,
      [
        { key: 'bill_number', header: 'Bill #' },
        { key: 'completed_at', header: 'Date', format: (v) => format(new Date(v as string), 'dd/MM/yyyy HH:mm') },
        { key: 'customers', header: 'Customer', format: (v) => (v as { name: string } | null)?.name || 'Walk-in' },
        { key: 'subtotal', header: 'Subtotal', format: (v) => Number(v).toFixed(2) },
        { key: 'discount_amount', header: 'Discount', format: (v) => Number(v).toFixed(2) },
        { key: 'tax_amount', header: 'Tax', format: (v) => Number(v).toFixed(2) },
        { key: 'total_amount', header: 'Total', format: (v) => Number(v).toFixed(2) },
      ],
      `monthly-report-${selectedMonth}`
    );
    toast.success('Monthly report exported');
  };

  // Greeting logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Good Morning', icon: Sunrise, emoji: '☀️' };
    if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', icon: Sun, emoji: '🌤️' };
    if (hour >= 17 && hour < 21) return { text: 'Good Evening', icon: Sunset, emoji: '🌅' };
    return { text: 'Good Night', icon: Moon, emoji: '🌙' };
  };
  const greeting = getGreeting();
  const displayName = profileDisplayName || user?.email?.split('@')[0] || 'User';

  // Download handler for Today's data
  const handleDownloadToday = async () => {
    try {
      // Fetch all today's completed bills with customer info
      const { data: todayBills, error: billsErr } = await supabase
        .from('bills')
        .select('id, bill_number, subtotal, discount_amount, tax_amount, total_amount, payment_type, payment_status, paid_amount, due_amount, profit, completed_at, customers(name)')
        .eq('status', 'completed')
        .gte('completed_at', startOfToday.toISOString());

      if (billsErr) throw billsErr;

      // Fetch all today's payments to get cash/online breakdown per bill
      const { data: allPayments, error: allPayErr } = await (supabase
        .from('bill_payments' as any)
        .select('bill_id, amount, payment_mode, created_at, notes, bills!inner(bill_number, total_amount, discount_amount, tax_amount, subtotal, payment_type, profit, created_at, customers(name))')
        .eq('business_id', businessId)
        .gte('created_at', startOfToday.toISOString()) as any);

      if (allPayErr) throw allPayErr;

      // Build per-bill cash/online breakdown from payments
      const billPaymentMap: Record<string, { cash: number; online: number }> = {};
      ((allPayments || []) as any[]).forEach((p: any) => {
        const billId = p.bill_id;
        if (!billPaymentMap[billId]) billPaymentMap[billId] = { cash: 0, online: 0 };
        if (p.payment_mode === 'cash') billPaymentMap[billId].cash += Number(p.amount || 0);
        else if (p.payment_mode === 'upi' || p.payment_mode === 'card') billPaymentMap[billId].online += Number(p.amount || 0);
      });

      // Build Table 1: Today's Sales
      const salesRows = (todayBills || []).map((b: any) => {
        const isDue = b.payment_status === 'unpaid' || b.payment_status === 'partial';
        const paymentMethod = isDue && Number(b.paid_amount || 0) === 0
          ? 'Due'
          : isDue
            ? `${(b.payment_type || 'cash').toUpperCase()} (Partial)`
            : (b.payment_type || 'cash').toUpperCase();
        const bp = billPaymentMap[b.id] || { cash: 0, online: 0 };
        return {
          billNumber: b.bill_number || '',
          customer: b.customers?.name || 'Walk-in',
          time: b.completed_at ? format(new Date(b.completed_at), 'hh:mm a') : '',
          total: Number(b.total_amount || 0),
          discount: Number(b.discount_amount || 0),
          tax: Number(b.tax_amount || 0),
          subtotal: Number(b.subtotal || 0),
          paymentMethod,
          cashCollection: isDue && Number(b.paid_amount || 0) === 0 ? 0 : bp.cash,
          onlineCollection: isDue && Number(b.paid_amount || 0) === 0 ? 0 : bp.online,
          collectedAmount: isDue && Number(b.paid_amount || 0) === 0 ? 0 : Number(b.paid_amount || b.total_amount || 0),
          profit: Number(b.profit || 0),
        };
      });

      // Build Table 2: Due Collections Received (with bill details)
      const dueCollectionRows = ((allPayments || []) as any[])
        .filter((p: any) => p.notes === 'due_bill' || new Date(p.bills.created_at).getTime() < startOfToday.getTime())
        .map((p: any) => {
          const isCash = p.payment_mode === 'cash';
          const isOnline = p.payment_mode === 'upi' || p.payment_mode === 'card';
          return {
            billNumber: p.bills?.bill_number || '',
            customer: p.bills?.customers?.name || 'Walk-in',
            billDate: p.bills?.created_at ? format(new Date(p.bills.created_at), 'dd/MM/yyyy') : '',
            time: p.created_at ? format(new Date(p.created_at), 'hh:mm a') : '',
            total: Number(p.bills?.total_amount || 0),
            discount: Number(p.bills?.discount_amount || 0),
            tax: Number(p.bills?.tax_amount || 0),
            subtotal: Number(p.bills?.subtotal || 0),
            paymentMethod: (p.payment_mode || '').toUpperCase(),
            cashCollection: isCash ? Number(p.amount || 0) : 0,
            onlineCollection: isOnline ? Number(p.amount || 0) : 0,
            collectedAmount: Number(p.amount || 0),
            profit: Number(p.bills?.profit || 0),
          };
        });

      const fmtNum = (v: unknown) => v === '' || v == null ? '' : Number(Number(v).toFixed(2));
      const salesColumns = [
        { key: 'billNumber', header: 'Bill Number' },
        { key: 'customer', header: 'Customer' },
        { key: 'time', header: 'Time' },
        { key: 'total', header: 'Total', format: fmtNum },
        { key: 'discount', header: 'Discount', format: fmtNum },
        { key: 'tax', header: 'Tax', format: fmtNum },
        { key: 'subtotal', header: 'Subtotal', format: fmtNum },
        { key: 'paymentMethod', header: 'Payment Method' },
        { key: 'cashCollection', header: 'Cash Collection', format: fmtNum },
        { key: 'onlineCollection', header: 'Online Collection', format: fmtNum },
        { key: 'collectedAmount', header: 'Collected Amount', format: fmtNum },
        { key: 'profit', header: 'Profit', format: fmtNum },
      ];

      const dueColumns = [
        { key: 'billNumber', header: 'Bill Number' },
        { key: 'customer', header: 'Customer' },
        { key: 'billDate', header: 'Bill Date' },
        { key: 'time', header: 'Payment Time' },
        { key: 'total', header: 'Total', format: fmtNum },
        { key: 'discount', header: 'Discount', format: fmtNum },
        { key: 'tax', header: 'Tax', format: fmtNum },
        { key: 'subtotal', header: 'Subtotal', format: fmtNum },
        { key: 'paymentMethod', header: 'Payment Method' },
        { key: 'cashCollection', header: 'Cash Collection', format: fmtNum },
        { key: 'onlineCollection', header: 'Online Collection', format: fmtNum },
        { key: 'collectedAmount', header: 'Collected Amount', format: fmtNum },
        { key: 'profit', header: 'Profit', format: fmtNum },
      ];

      // Calculate summary
      const totalBills = salesRows.length;
      const dueBills = salesRows.filter(r => r.paymentMethod === 'Due' || r.paymentMethod.includes('Partial')).length;
      const totalSales = salesRows.reduce((s, r) => s + r.total, 0);
      const totalDiscount = salesRows.reduce((s, r) => s + r.discount, 0);
      const totalTax = salesRows.reduce((s, r) => s + r.tax, 0);
      const totalCash = salesRows.reduce((s, r) => s + r.cashCollection, 0);
      const totalOnline = salesRows.reduce((s, r) => s + r.onlineCollection, 0);
      const totalCollected = salesRows.reduce((s, r) => s + r.collectedAmount, 0);
      const totalProfit = salesRows.reduce((s, r) => s + r.profit, 0);
      const totalDueCollected = dueCollectionRows.reduce((s, r) => s + r.collectedAmount, 0);
      const totalDueProfit = dueCollectionRows.reduce((s, r) => s + r.profit, 0);

      const summary: ExcelSummaryDef = {
        title: `Daily Summary — ${format(today, 'dd MMM yyyy')}`,
        items: [
          { label: 'Total Bills', value: totalBills },
          { label: 'Due Bills', value: dueBills },
          { label: 'Total Sales', value: totalSales.toFixed(2) },
          { label: 'Total Discount', value: totalDiscount.toFixed(2) },
          { label: 'Total Tax', value: totalTax.toFixed(2) },
          { label: 'Total Collected', value: totalCollected.toFixed(2) },
          { label: 'Cash Collection', value: totalCash.toFixed(2) },
          { label: 'Online Collection', value: totalOnline.toFixed(2) },
          { label: 'Total Profit', value: totalProfit.toFixed(2) },
          { label: 'Due Collections Received', value: totalDueCollected.toFixed(2) },
          { label: 'Profit from Due Collections', value: totalDueProfit.toFixed(2) },
        ],
      };

      const tables: ExcelTableDef[] = [
        { title: "Today's Sales", titleColor: '1F4E79', data: salesRows, columns: salesColumns },
      ];

      if (dueCollectionRows.length > 0) {
        tables.push({ title: 'Due Collections Received', titleColor: 'D35400', data: dueCollectionRows, columns: dueColumns });
      }

      if (salesRows.length === 0 && dueCollectionRows.length === 0) {
        toast.error('No data to export for today');
        return;
      }

      exportStyledExcel(tables, summary, `todays-performance-${format(today, 'yyyy-MM-dd')}`);
      toast.success('Today\'s data exported');
    } catch {
      toast.error('Failed to export today\'s data');
    }
  };

  // Download handler for Monthly data (day-wise breakdown)
  const handleDownloadMonthly = async () => {
    try {
      const monthStart = startOfThisMonth;
      const { data: bills, error } = await supabase
        .from('bills')
        .select('total_amount, profit, due_amount, payment_status, completed_at')
        .eq('status', 'completed')
        .gte('completed_at', monthStart.toISOString());
      if (error) throw error;

      const { data: payments, error: payError } = await (supabase
        .from('bill_payments' as any)
        .select('amount, payment_mode, notes, created_at, bills!inner(created_at)')
        .eq('business_id', businessId)
        .gte('created_at', monthStart.toISOString()) as any);

      const dayMap: Record<string, import('@/lib/exportToExcel').DayWiseSummaryRow> = {};
      const getRow = (dateStr: string) => {
        if (!dayMap[dateStr]) dayMap[dateStr] = { day: dateStr, orders: 0, daySales: 0, dayProfit: 0, cashCollection: 0, onlineCollection: 0, dueCollection: 0, dueAmount: 0 };
        return dayMap[dateStr];
      };

      (bills || []).forEach((b: any) => {
        const d = format(new Date(b.completed_at), 'dd MMM yyyy');
        const r = getRow(d);
        r.orders++;
        r.daySales += Number(b.total_amount || 0);
        r.dayProfit += Number(b.profit || 0);
        if (b.payment_status === 'unpaid' || b.payment_status === 'partial') r.dueAmount += Number(b.due_amount || 0);
      });

      if (!payError && payments) {
        (payments as any[]).forEach((p: any) => {
          const d = format(new Date(p.created_at), 'dd MMM yyyy');
          const r = getRow(d);
          if (p.payment_mode === 'cash') r.cashCollection += Number(p.amount || 0);
          else if (p.payment_mode === 'upi' || p.payment_mode === 'card') r.onlineCollection += Number(p.amount || 0);
          if (p.notes === 'due_bill') r.dueCollection += Number(p.amount || 0);
        });
      }

      const rows = Object.values(dayMap).sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
      if (rows.length === 0) { toast.error('No data for this month'); return; }
      exportDayWiseSummary(rows, `monthly-performance-${format(today, 'yyyy-MM')}`);
      toast.success('Monthly data exported');
    } catch { toast.error('Failed to export monthly data'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Greeting Header + Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="spos-page-heading" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{greeting.emoji}</span>
            {greeting.text}, <span style={{ color: 'var(--spos-accent)', textTransform: 'capitalize' }}>{displayName}</span>
          </h1>
          <p className="spos-page-subhead" style={{ marginBottom: 0 }}>
            Here's what's happening with your business today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate('/billing')} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Bill</span>
            <span className="sm:hidden">Bill</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/products')} className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Product</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/customers')} className="gap-1.5 hidden sm:flex">
            <UserPlus className="h-3.5 w-3.5" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* ── Today's Performance ── */}
      <div className="flex items-center justify-between">
        <div className="spos-section-label">Today's Performance</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleDownloadToday}>
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary" onClick={() => navigate('/bills-history')}>
            See Details <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="spos-kpi-grid">
        <KPICard title="Today's Sales" value={`${currencySymbol}${todayStats?.sales?.toFixed(2) || '0.00'}`} icon={DollarSign} description="Total sales amount today" isLoading={loadingTodayStats} color="green" index={0} />
        <KPICard title="Today's Profit" value={`${currencySymbol}${(todayStats?.profit || 0).toFixed(2)}`} icon={TrendingUp} description="Profit earned today" isLoading={loadingTodayStats} color="green" index={1} />
        <KPICard title="Today's Cash Collection" value={`${currencySymbol}${(todayPayments?.cash || 0).toFixed(2)}`} icon={Wallet} description="Cash payments received today" isLoading={loadingTodayPayments} color="blue" index={2} />
        <KPICard title="Today's Online Collection" value={`${currencySymbol}${(todayPayments?.online || 0).toFixed(2)}`} icon={Smartphone} description="UPI/Card payments today" isLoading={loadingTodayPayments} color="blue" index={3} />
        <KPICard title="Today's Orders" value={todayStats?.orders || 0} icon={ShoppingCart} description="Total bills created today" isLoading={loadingTodayStats} color="blue" index={4} />
        <KPICard title="Today's Due Bills" value={todayStats?.dueBillsList?.length || 0} icon={AlertTriangle} description="Bills created today but not fully paid" isLoading={loadingTodayStats} color="amber" index={5} onClick={() => setActiveModalData({ type: 'dueBills', title: 'Today\'s Due Bills', data: todayStats?.dueBillsList || [] })} />
        <KPICard title="Today's Due Collection" value={`${currencySymbol}${(todayPayments?.dueCollectionSum || 0).toFixed(2)}`} icon={CreditCard} description="Payments received today from due invoices" isLoading={loadingTodayPayments} color="amber" index={6} onClick={() => setActiveModalData({ type: 'dueCollections', title: 'Today\'s Due Collection', data: todayPayments?.dueCollectionList || [] })} />
        <KPICard title="Today's Total Due Amount" value={`${currencySymbol}${(todayStats?.dueAmount || 0).toFixed(2)}`} icon={AlertTriangle} description="Remaining amount from today's due bills" isLoading={loadingTodayStats} color="red" index={7} onClick={() => setActiveModalData({ type: 'dueBills', title: 'Today\'s Due Bills', data: todayStats?.dueBillsList || [] })} />
      </div>

      {/* ── Monthly Performance ── */}
      <div className="flex items-center justify-between" style={{ marginTop: 24 }}>
        <div className="spos-section-label">Monthly Performance</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleDownloadMonthly}>
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary" onClick={() => navigate('/bills-history')}>
            See Details <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="spos-kpi-grid">
        <KPICard title="Monthly Sales" value={`${currencySymbol}${(monthlyStats?.revenue || 0).toFixed(2)}`} icon={TrendingUp} description="Total sales this month" isLoading={loadingMonthlyStats} color="green" index={0} />
        <KPICard title="Monthly Profit" value={`${currencySymbol}${(monthlyStats?.profit || 0).toFixed(2)}`} icon={DollarSign} description="Profit this month" isLoading={loadingMonthlyStats} color="green" index={1} />
        <KPICard title="Monthly Orders" value={monthlyStats?.orders || 0} icon={ShoppingCart} description="Number of invoices created this month" isLoading={loadingMonthlyStats} color="blue" index={2} />
        <KPICard title="Monthly Due Bills" value={monthlyStats?.dueBillsList?.length || 0} icon={AlertTriangle} description="Unpaid bills from this month" isLoading={loadingMonthlyStats} color="amber" index={3} onClick={() => setActiveModalData({ type: 'dueBills', title: 'Monthly Due Bills', data: monthlyStats?.dueBillsList || [] })} />
        <KPICard title="Monthly Due Collection" value={`${currencySymbol}${(monthlyPayments?.dueCollectionSum || 0).toFixed(2)}`} icon={CreditCard} description="Payments collected this month from due bills" isLoading={loadingMonthlyPayments} color="amber" index={4} onClick={() => setActiveModalData({ type: 'dueCollections', title: 'Monthly Due Collection', data: monthlyPayments?.dueCollectionList || [] })} />
        <KPICard title="Monthly Total Due Amount" value={`${currencySymbol}${(monthlyStats?.dueAmount || 0).toFixed(2)}`} icon={AlertTriangle} description="Remaining amount from this month's due bills" isLoading={loadingMonthlyStats} color="red" index={5} onClick={() => setActiveModalData({ type: 'dueBills', title: 'Monthly Due Bills', data: monthlyStats?.dueBillsList || [] })} />
      </div>

      {/* ── Overall Operations ── */}
      <div className="flex items-center justify-between" style={{ marginTop: 24 }}>
        <div className="spos-section-label">Overall Operations</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary" onClick={() => navigate('/bills-history')}>
            See Details <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="spos-kpi-grid">
        <KPICard title="Total Customers" value={customerCount || 0} icon={Users} description="Total registered customers" isLoading={loadingCustomers} color="blue" index={0} />
        <KPICard title="Inventory Value" value={`${currencySymbol}${(inventoryValue || 0).toFixed(2)}`} icon={Package} description="Total value of stock" isLoading={loadingInventoryValue} color="amber" index={1} />
        <KPICard title="Total Due Amount" value={`${currencySymbol}${(dueStats?.totalDue || 0).toFixed(2)}`} icon={AlertTriangle} description="Outstanding payments" isLoading={loadingDue} color="amber" index={2} />
        <KPICard title="Draft Bills" value={pendingBills} icon={ShoppingCart} description="Bills saved but not finalized" isLoading={loadingPending} color="amber" index={3} />
        <KPICard title="Low Stock Items" value={lowStockProducts?.length || 0} icon={Package} description="Products below minimum stock" isLoading={loadingLowStock} color="red" index={4} />
        {(dueStats?.overdueCount || 0) > 0 && (
          <KPICard title="Overdue Bills" value={dueStats?.overdueCount || 0} icon={AlertTriangle} description="Past due date" isLoading={loadingDue} color="red" index={5} />
        )}
      </div>

      {/* Monthly Expense Report */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                Monthly Report
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Revenue, costs, and profit summary</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 sm:w-44">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportMonthlyReport} className="shrink-0">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export Excel</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingExpense ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Revenue', value: `${currencySymbol}${monthlyTotals.revenue.toFixed(2)}`, sub: `${monthlyTotals.orderCount} orders`, bg: 'bg-emerald-50 dark:bg-emerald-950/20', grad: 'from-emerald-500 to-green-600', text: 'text-emerald-600' },
                { label: 'Total Cost',    value: `${currencySymbol}${monthlyTotals.cost.toFixed(2)}`,    sub: 'Product costs',   bg: 'bg-amber-50  dark:bg-amber-950/20',   grad: 'from-amber-500  to-orange-500',  text: 'text-amber-600' },
                { label: 'Discounts',     value: `${currencySymbol}${monthlyTotals.discounts.toFixed(2)}`, sub: 'Total discounts', bg: 'bg-rose-50   dark:bg-rose-950/20',    grad: 'from-rose-500   to-pink-600',    text: 'text-rose-600' },
                { label: 'Net Profit',    value: `${currencySymbol}${monthlyTotals.profit.toFixed(2)}`,  sub: monthlyTotals.revenue > 0 ? `${((monthlyTotals.profit / monthlyTotals.revenue) * 100).toFixed(1)}% margin` : 'No sales', bg: monthlyTotals.profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-rose-50 dark:bg-rose-950/20', grad: monthlyTotals.profit >= 0 ? 'from-emerald-500 to-green-600' : 'from-rose-500 to-pink-600', text: monthlyTotals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600' },
              ].map(card => (
                <div key={card.label} className={cn('rounded-2xl border p-4 relative overflow-hidden', card.bg)}>
                  <div className={cn('absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br opacity-10', card.grad)} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{card.label}</p>
                  <p className={cn('text-xl font-black leading-none mt-1', card.text)}>{card.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{card.sub}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft Bills Section */}
      {draftBills.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-teal-600" />
                  Draft Orders
                </CardTitle>
                <CardDescription>
                  {isSalesman ? 'Your pending draft orders' : 'Draft orders from salesmen awaiting finalization'}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                {draftBills.length} Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDrafts ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground font-medium">
                      <th className="text-left py-2 px-1">Bill #</th>
                      <th className="text-left py-2 px-1 hidden md:table-cell">Salesman</th>
                      <th className="text-left py-2 px-1">Customer</th>
                      <th className="text-left py-2 px-1 hidden lg:table-cell">Last Updated</th>
                      <th className="text-right py-2 px-1">Total</th>
                      <th className="text-right py-2 px-1">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {draftBills.map((draft: any) => (
                      <tr
                        key={draft.id}
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedDraftBillId(draft.id)}
                      >
                        <td className="py-3 px-1 font-medium text-xs sm:text-sm">{draft.bill_number}</td>
                        <td className="py-3 px-1 hidden md:table-cell text-xs sm:text-sm">{draft.salesman_name || 'N/A'}</td>
                        <td className="py-3 px-1 text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{draft.customers?.name || 'Walk-in'}</td>
                        <td className="py-3 px-1 hidden lg:table-cell text-xs text-muted-foreground">
                          {format(new Date(draft.created_at), 'dd/MM HH:mm')}
                        </td>
                        <td className="py-3 px-1 text-right font-bold">
                          {currencySymbol}{Number(draft.total_amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-1 text-right">
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[10px]">
                            DRAFT
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>Products that need restocking</CardDescription>
              </div>
              {lowStockProducts && lowStockProducts.length > 0 && (
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => navigate('/products')}>
                  <Package className="h-3.5 w-3.5" />
                  Update Stock
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingLowStock ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : lowStockProducts && lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <span className="text-sm text-destructive font-medium">
                      {product.stock_quantity} left
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                All products are well stocked!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Bills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Recent Bills
            </CardTitle>
            <CardDescription>Latest billing activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRecent ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentBills && recentBills.length > 0 ? (
              <div className="space-y-3">
                {recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{bill.bill_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {bill.customers?.name || 'Walk-in Customer'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {currencySymbol}{Number(bill.total_amount).toFixed(2)}
                      </p>
                      <span
                        className={`text-xs capitalize ${bill.status === 'completed'
                          ? 'text-green-600'
                          : bill.status === 'draft'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                          }`}
                      >
                        {bill.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No bills yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Draft Bill Popup Modal */}
      {/* Interactive Daily/Monthly Sub-records Modal */}
      <Dialog open={!!activeModalData} onOpenChange={(open) => { if (!open) setActiveModalData(null); }}>
        <DialogContent className="max-w-max min-w-[500px]">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle>{activeModalData?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-2 max-h-[60vh] overflow-y-auto">
            {activeModalData?.data?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground/50 mb-3" />
                <p>No records found for this KPI.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Customer</TableHead>
                    {activeModalData?.type === 'dueCollections' ? (
                      <>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Collection Amount</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Due Amount</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeModalData?.data?.map((item, idx) => {
                    if (activeModalData.type === 'dueCollections') {
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-mono font-medium">{item.bills?.bill_number}</TableCell>
                          <TableCell>{item.bills?.customers?.name || 'Walk-in'}</TableCell>
                          <TableCell className="uppercase text-xs font-semibold text-muted-foreground tracking-wider">{item.payment_mode}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {currencySymbol}{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {format(new Date(item.created_at), 'dd MMM yy')}
                          </TableCell>
                        </TableRow>
                      );
                    } else {
                      return (
                        <TableRow key={item.id || idx}>
                          <TableCell className="font-mono font-medium">{item.bill_number}</TableCell>
                          <TableCell>{item.customers?.name ? item.customers.name : 'Walk-in'}</TableCell>
                          <TableCell className="text-right">
                            {currencySymbol}{Number(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-bold text-destructive">
                            {currencySymbol}{Number(item.due_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-primary/5 hover:bg-primary hover:text-white" onClick={() => { setActiveModalData(null); navigate('/due-bills'); }}>Pay Now</Button>
                          </TableCell>
                        </TableRow>
                      );
                    }
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveModalData(null)}>Close</Button>
            {activeModalData?.type === 'dueBills' && activeModalData.data.length > 0 && (
              <Button onClick={() => { setActiveModalData(null); navigate('/due-bills'); }}>Manage All</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Display Name Onboarding Prompt */}
      {user && (
        <DisplayNamePrompt
          userId={user.id}
          open={showNamePrompt}
          onComplete={(name) => {
            setProfileDisplayName(name);
            setShowNamePrompt(false);
          }}
        />
      )}
    </div>
  );
}
