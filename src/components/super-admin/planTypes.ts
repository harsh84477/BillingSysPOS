// ─────────────────────────────────────────────────────────
// planTypes.ts — Shared types & constants for Plans & Pricing
// ─────────────────────────────────────────────────────────

// ── Feature categories for the plan builder ──

export interface FeatureToggle {
  key: string;
  label: string;
  description?: string;
}

export interface FeatureCategory {
  id: string;
  label: string;
  icon: string; // lucide icon name
  features: FeatureToggle[];
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: 'billing',
    label: 'Billing Features',
    icon: 'receipt',
    features: [
      { key: 'gst_billing', label: 'GST Billing', description: 'Enable GST tax calculations' },
      { key: 'e_invoice', label: 'E-Invoice', description: 'Generate e-invoices' },
      { key: 'thermal_printing', label: 'Thermal Printing', description: 'Support for thermal printers' },
      { key: 'unlimited_billing', label: 'Unlimited Billing', description: 'No daily bill limits' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory Features',
    icon: 'package',
    features: [
      { key: 'barcode_support', label: 'Barcode Support', description: 'Scan and print barcodes' },
      { key: 'bulk_import_export', label: 'Bulk Import/Export', description: 'Excel/CSV import & export' },
    ],
  },
  {
    id: 'team',
    label: 'Team Features',
    icon: 'users',
    features: [
      { key: 'allow_managers', label: 'Allow Managers', description: 'Add manager roles' },
      { key: 'allow_cashiers', label: 'Allow Cashiers', description: 'Add cashier roles' },
      { key: 'allow_salesmen', label: 'Allow Salesmen', description: 'Add salesman roles' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics Features',
    icon: 'bar-chart-3',
    features: [
      { key: 'profit_reports', label: 'Profit Reports', description: 'Detailed profit analysis' },
      { key: 'sales_analytics', label: 'Sales Analytics', description: 'Sales trends & insights' },
      { key: 'inventory_reports', label: 'Inventory Reports', description: 'Stock movement reports' },
    ],
  },
  {
    id: 'premium',
    label: 'Premium Features',
    icon: 'sparkles',
    features: [
      { key: 'whatsapp_integration', label: 'WhatsApp Integration', description: 'Send bills via WhatsApp' },
      { key: 'api_access', label: 'API Access', description: 'REST API for integrations' },
      { key: 'ai_reports', label: 'AI Reports', description: 'AI-powered business insights' },
      { key: 'custom_branding', label: 'Custom Branding', description: 'Your own logo & colors' },
      { key: 'remove_platform_branding', label: 'Remove Platform Branding', description: 'White-label invoices' },
    ],
  },
];

// All feature keys flattened
export const ALL_FEATURE_KEYS = FEATURE_CATEGORIES.flatMap(c => c.features.map(f => f.key));

// ── Duration options ──

export interface DurationOption {
  value: string;
  label: string;
  months: number | null; // null = lifetime or custom
  shortLabel: string;
}

export const DURATION_OPTIONS: DurationOption[] = [
  { value: '1_month', label: '1 Month', months: 1, shortLabel: '/mo' },
  { value: '3_months', label: '3 Months', months: 3, shortLabel: '/3mo' },
  { value: '6_months', label: '6 Months', months: 6, shortLabel: '/6mo' },
  { value: 'yearly', label: '1 Year', months: 12, shortLabel: '/yr' },
  { value: '2_years', label: '2 Years', months: 24, shortLabel: '/2yr' },
  { value: '5_years', label: '5 Years', months: 60, shortLabel: '/5yr' },
  { value: '10_years', label: '10 Years', months: 120, shortLabel: '/10yr' },
  { value: 'lifetime', label: 'Lifetime', months: null, shortLabel: '' },
  { value: 'custom', label: 'Custom Duration', months: null, shortLabel: '' },
];

// Legacy period mapping (DB values → display)
export const PERIOD_LABELS: Record<string, string> = {
  monthly: '1 Month',
  '1_month': '1 Month',
  '3_months': '3 Months',
  '6_months': '6 Months',
  yearly: '1 Year',
  '2_years': '2 Years',
  '5_years': '5 Years',
  '10_years': '10 Years',
  lifetime: 'Lifetime',
  trial: 'Trial',
  custom: 'Custom',
};

export const PERIOD_SHORT: Record<string, string> = {
  monthly: '/mo',
  '1_month': '/mo',
  '3_months': '/3mo',
  '6_months': '/6mo',
  yearly: '/yr',
  '2_years': '/2yr',
  '5_years': '/5yr',
  '10_years': '/10yr',
  lifetime: '',
  trial: '',
  custom: '',
};

// ── Badge options ──

export interface BadgeOption {
  value: string;
  label: string;
  color: string; // tailwind class prefix
}

export const BADGE_OPTIONS: BadgeOption[] = [
  { value: '', label: 'None', color: '' },
  { value: 'popular', label: 'Popular', color: 'violet' },
  { value: 'recommended', label: 'Recommended', color: 'blue' },
  { value: 'best_value', label: 'Best Value', color: 'emerald' },
  { value: 'enterprise', label: 'Enterprise', color: 'amber' },
  { value: 'starter', label: 'Starter', color: 'slate' },
  { value: 'new', label: 'New', color: 'rose' },
];

// ── Plan accent colors ──

export interface PlanColor {
  value: string;
  label: string;
  bg: string;
  text: string;
  border: string;
  ring: string;
  gradient: string;
}

export const PLAN_COLORS: PlanColor[] = [
  { value: 'violet', label: 'Violet', bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-200', ring: 'ring-violet-500/30', gradient: 'from-violet-500/10 to-violet-600/5' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-200', ring: 'ring-blue-500/30', gradient: 'from-blue-500/10 to-blue-600/5' },
  { value: 'emerald', label: 'Emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-500/30', gradient: 'from-emerald-500/10 to-emerald-600/5' },
  { value: 'amber', label: 'Amber', bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-200', ring: 'ring-amber-500/30', gradient: 'from-amber-500/10 to-amber-600/5' },
  { value: 'rose', label: 'Rose', bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-200', ring: 'ring-rose-500/30', gradient: 'from-rose-500/10 to-rose-600/5' },
  { value: 'cyan', label: 'Cyan', bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-200', ring: 'ring-cyan-500/30', gradient: 'from-cyan-500/10 to-cyan-600/5' },
  { value: 'slate', label: 'Slate', bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-200', ring: 'ring-slate-500/30', gradient: 'from-slate-500/10 to-slate-600/5' },
];

// ── Plan limit fields ──

export interface LimitField {
  key: string;
  label: string;
  icon: string;
  unit?: string;
  defaultValue: number;
}

export const PLAN_LIMIT_FIELDS: LimitField[] = [
  { key: 'max_users', label: 'Maximum Users', icon: 'users', defaultValue: 5 },
  { key: 'max_products', label: 'Maximum Products', icon: 'package', defaultValue: 100 },
  { key: 'max_branches', label: 'Maximum Branches', icon: 'building-2', defaultValue: 1 },
  { key: 'max_bills_per_day', label: 'Bills Per Day', icon: 'file-spreadsheet', defaultValue: 50 },
  { key: 'max_storage_gb', label: 'Storage (GB)', icon: 'hard-drive', unit: 'GB', defaultValue: 1 },
  { key: 'max_items_per_day', label: 'Items Per Day', icon: 'layers', defaultValue: 100 },
  { key: 'history_days', label: 'History Retention (Days)', icon: 'clock', defaultValue: 30 },
];

// ── Extended Plan Features Interface ──

export interface PlanFeatures {
  // Feature list (legacy, kept for backward compat)
  feature_list?: string[];

  // Toggleable features (organized by category)
  gst_billing?: boolean;
  e_invoice?: boolean;
  thermal_printing?: boolean;
  unlimited_billing?: boolean;
  barcode_support?: boolean;
  bulk_import_export?: boolean;
  allow_managers?: boolean;
  allow_cashiers?: boolean;
  allow_salesmen?: boolean;
  profit_reports?: boolean;
  sales_analytics?: boolean;
  inventory_reports?: boolean;
  whatsapp_integration?: boolean;
  api_access?: boolean;
  ai_reports?: boolean;
  custom_branding?: boolean;
  remove_platform_branding?: boolean;

  // Limits
  max_users?: number;
  max_products?: number;
  max_branches?: number;
  max_bills_per_day?: number;
  max_items_per_day?: number;
  max_storage_gb?: number;
  history_days?: number;
  staff_limit?: number;

  // Legacy fields (backward compat)
  support?: string;
  can_export?: boolean;

  // Plan metadata (stored in features JSON)
  badge?: string;
  accent_color?: string;
  custom_duration_days?: number;
}

// ── Plan Interface ──

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_period: string;
  features: PlanFeatures;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// ── Plan form state ──

export interface PlanFormState {
  name: string;
  description: string;
  price: number;
  billing_period: string;
  custom_duration_days: number;
  is_active: boolean;
  badge: string;
  accent_color: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  unlimited: Record<string, boolean>;
  support: string;
  feature_list_text: string;
}

export const DEFAULT_PLAN_FORM: PlanFormState = {
  name: '',
  description: '',
  price: 0,
  billing_period: '1_month',
  custom_duration_days: 30,
  is_active: true,
  badge: '',
  accent_color: 'violet',
  features: {},
  limits: {
    max_users: 5,
    max_products: 100,
    max_branches: 1,
    max_bills_per_day: 50,
    max_items_per_day: 100,
    max_storage_gb: 1,
    history_days: 30,
  },
  unlimited: {},
  support: 'None',
  feature_list_text: '',
};

// ── Utilities ──

export function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);
}

export function getPlanColor(colorValue: string | undefined): PlanColor {
  return PLAN_COLORS.find(c => c.value === colorValue) || PLAN_COLORS[0];
}

export function getBadgeConfig(badgeValue: string | undefined): BadgeOption {
  return BADGE_OPTIONS.find(b => b.value === badgeValue) || BADGE_OPTIONS[0];
}

/** Convert PlanFormState → DB payload features JSONB */
export function formToFeatures(form: PlanFormState): PlanFeatures {
  const features: PlanFeatures = {};

  // Feature toggles
  for (const key of ALL_FEATURE_KEYS) {
    if (form.features[key]) {
      (features as any)[key] = true;
    }
  }

  // Limits
  for (const field of PLAN_LIMIT_FIELDS) {
    if (form.unlimited[field.key]) {
      (features as any)[field.key] = -1;
    } else {
      (features as any)[field.key] = form.limits[field.key] ?? field.defaultValue;
    }
  }

  // Support level
  features.support = form.support;

  // Can export (derived from bulk_import_export)
  features.can_export = !!form.features.bulk_import_export;

  // Badge & color
  features.badge = form.badge;
  features.accent_color = form.accent_color;

  // Custom duration
  if (form.billing_period === 'custom') {
    features.custom_duration_days = form.custom_duration_days;
  }

  // Feature list (text lines)
  const featureList = form.feature_list_text
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);
  if (featureList.length > 0) {
    features.feature_list = featureList;
  }

  return features;
}

/** Convert DB Plan → PlanFormState */
export function planToForm(plan: Plan): PlanFormState {
  const f = plan.features || {};

  // Feature toggles
  const features: Record<string, boolean> = {};
  for (const key of ALL_FEATURE_KEYS) {
    features[key] = !!(f as any)[key];
  }

  // Limits
  const limits: Record<string, number> = {};
  const unlimited: Record<string, boolean> = {};
  for (const field of PLAN_LIMIT_FIELDS) {
    const val = (f as any)[field.key];
    if (val === -1) {
      unlimited[field.key] = true;
      limits[field.key] = field.defaultValue;
    } else {
      limits[field.key] = val ?? field.defaultValue;
    }
  }

  return {
    name: plan.name,
    description: plan.description || '',
    price: plan.price,
    billing_period: plan.billing_period,
    custom_duration_days: f.custom_duration_days || 30,
    is_active: plan.is_active,
    badge: f.badge || '',
    accent_color: f.accent_color || 'violet',
    features,
    limits,
    unlimited,
    support: f.support || 'None',
    feature_list_text: (f.feature_list || []).join('\n'),
  };
}
