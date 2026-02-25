# Production-Level SaaS Multi-Tenant POS Billing System
## Complete Architecture & Implementation Guide

**Last Updated:** February 26, 2026  
**Version:** 2.0 - Advanced Features Build

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Database Architecture](#database-architecture)
3. [Key Features](#key-features)
4. [Implementation Details](#implementation-details)
5. [API Reference](#api-reference)
6. [Frontend Components](#frontend-components)
7. [Offline Sync System](#offline-sync-system)
8. [Security & RLS Policies](#security--rls-policies)
9. [Deployment Checklist](#deployment-checklist)

---

## System Overview

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│          Mobile/Web Frontend (React + TypeScript)       │
│   ├─ Salesman Interface                                 │
│   ├─ Manager Dashboard                                  │
│   ├─ Owner Analytics                                    │
│   └─ Offline-First PWA                                  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Frontend State Management & Offline Storage             │
│   ├─ React Query (Server Cache)                         │
│   ├─ IndexedDB (Offline Storage)                        │
│   └─ Sync Manager                                       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│        Supabase Backend (PostgreSQL DB)                  │
│   ├─ Row Level Security (RLS)                           │
│   ├─ Database Functions (PLpgSQL)                       │
│   ├─ Triggers & Audit Logs                             │
│   └─ Real-time Subscriptions                           │
└─────────────────────────────────────────────────────────┘
```

### Multi-Tenancy Architecture

- **Isolation Level:** Per-business segregation using `business_id`
- **Authentication:** Auth via Supabase (OAuth/Email/Magic Link)
- **Authorization:** Role-based access control (RBAC)
- **Audit Trail:** Complete activity logging with change tracking

---

## Database Architecture

### Core Tables

#### 1. **Businesses** (Multi-Tenant Container)
```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY,
  business_name TEXT,
  owner_id UUID REFERENCES auth.users(id),
  mobile_number TEXT UNIQUE,
  join_code TEXT UNIQUE,
  max_members INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 2. **User Roles** (RBAC)
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  business_id UUID REFERENCES businesses(id),
  role app_role ('owner', 'manager', 'cashier', 'salesman'),
  bill_prefix TEXT,
  created_at TIMESTAMPTZ
);
```

#### 3. **Products** (Inventory Management)
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  business_id UUID,
  category_id UUID,
  name TEXT NOT NULL,
  selling_price NUMERIC(12,2),
  cost_price NUMERIC(12,2),
  stock_quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0, -- Draft reservation
  low_stock_threshold INTEGER,
  created_at TIMESTAMPTZ
);
```

- `stock_quantity`: Actual physical stock
- `reserved_quantity`: Stock reserved for draft bills (configurable)
- Available stock = `stock_quantity - reserved_quantity`

#### 4. **Bills** (Complete Bill Management)
```sql
CREATE TABLE bills (
  id UUID PRIMARY KEY,
  business_id UUID,
  bill_number TEXT NOT NULL,
  customer_id UUID,
  created_by UUID,
  status bill_status ('draft', 'completed', 'cancelled', 'due', 'overdue'),
  subtotal NUMERIC(12,2),
  discount_amount NUMERIC(12,2),
  tax_amount NUMERIC(12,2),
  total_amount NUMERIC(12,2),
  payment_status TEXT ('paid', 'partial', 'unpaid'),
  paid_amount NUMERIC(12,2),
  due_amount NUMERIC(12,2),
  due_date DATE,
  profit NUMERIC(12,2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 5. **Bill Items** (Line Items)
```sql
CREATE TABLE bill_items (
  id UUID PRIMARY KEY,
  bill_id UUID REFERENCES bills(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER,
  unit_price NUMERIC(12,2),
  cost_price NUMERIC(12,2),
  total_price NUMERIC(12,2),
  created_at TIMESTAMPTZ
);
```

### Advanced Feature Tables

#### 6. **Split Payment System**

```sql
-- Payment Modes Configuration (per business)
CREATE TABLE payment_modes_config (
  id UUID PRIMARY KEY,
  business_id UUID UNIQUE,
  is_cash_enabled BOOLEAN DEFAULT true,
  is_upi_enabled BOOLEAN DEFAULT true,
  is_card_enabled BOOLEAN DEFAULT false,
  is_credit_enabled BOOLEAN DEFAULT false,
  enable_split_payment BOOLEAN DEFAULT false
);

-- Individual Payments (for split payment tracking)
CREATE TABLE bill_payments (
  id UUID PRIMARY KEY,
  bill_id UUID REFERENCES bills(id),
  business_id UUID,
  payment_mode payment_mode ('cash', 'upi', 'card', 'credit'),
  amount NUMERIC(12,2),
  collected_by UUID,
  is_offline BOOLEAN,
  transaction_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
);
```

#### 7. **Customer Credit System**

```sql
-- Credit Limits (per customer)
CREATE TABLE customer_credit_limits (
  id UUID PRIMARY KEY,
  customer_id UUID,
  business_id UUID,
  credit_limit NUMERIC(12,2),
  current_balance NUMERIC(12,2),
  created_at TIMESTAMPTZ
);

-- Audit Ledger
CREATE TABLE customer_credit_ledger (
  id UUID PRIMARY KEY,
  business_id UUID,
  customer_id UUID,
  bill_id UUID,
  transaction_type TEXT ('debit', 'credit', 'payment', 'adjustment'),
  amount NUMERIC(12,2),
  previous_balance NUMERIC(12,2),
  new_balance NUMERIC(12,2),
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ
);
```

#### 8. **Expense Tracking**

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  business_id UUID,
  category expense_category, 
  -- ('rent', 'salary', 'electricity', 'transport', 'maintenance', 'internet', 'miscellaneous')
  amount NUMERIC(12,2),
  description TEXT,
  receipt_url TEXT,
  expense_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ
);
```

#### 9. **Activity Logging System**

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY,
  business_id UUID,
  user_id UUID,
  action activity_action, 
  -- ('create_bill', 'update_bill', 'finalize_bill', 'cancel_bill', etc.)
  target_type TEXT ('bill', 'product', 'customer', 'expense'),
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ
);
```

#### 10. **Offline Sync System**

```sql
-- Sync Queue (for pending operations)
CREATE TABLE offline_sync_queue (
  id UUID PRIMARY KEY,
  business_id UUID,
  user_id UUID,
  operation_type TEXT,
  table_name TEXT,
  record_id UUID,
  data JSONB,
  status offline_sync_status ('pending', 'syncing', 'synced', 'failed', 'conflict'),
  error_message TEXT,
  created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
);

-- Local Cache
CREATE TABLE offline_data_cache (
  id UUID PRIMARY KEY,
  business_id UUID,
  user_id UUID,
  cache_type TEXT ('products', 'customers', 'bills', 'categories'),
  cache_data JSONB,
  last_synced TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Conflict Resolution
CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY,
  business_id UUID,
  queue_id UUID,
  conflict_type TEXT,
  offline_data JSONB,
  server_data JSONB,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);
```

---

## Key Features

### 1. **Draft Stock Reservation** ✅

**Control:** `business_settings.enable_draft_stock_reservation` (boolean)

**Logic:**
- **When OFF:** Stock deducted only on bill finalization
- **When ON:**
  - `available_stock = stock_quantity - reserved_quantity`
  - Creating draft → increases `reserved_quantity`
  - Finalizing bill → decreases both `stock_quantity` and `reserved_quantity`
  - Cancelling draft → restores `reserved_quantity`

**Database Constraints:**
```sql
-- Always ensure non-negative
CHECK (stock_quantity >= 0)
CHECK (reserved_quantity >= 0)
CHECK (stock_quantity >= reserved_quantity)
```

### 2. **Split Payment System** ✅

**Control:** `business_settings.enable_split_payment` (boolean)

**Supported Payment Modes:**
- Cash
- UPI
- Card
- Credit (on account)

**Implementation:**
```typescript
// Frontend hook
const { addPayment, totalPaid } = useSplitPayment(billId);

// Add payment
await addPayment({
  payment_mode: 'upi',
  amount: 500,
  transaction_reference: 'UPI-TXN-123',
  notes: 'Payment via Google Pay'
});

// Bill payment status
// - paid: total_amount fully received
// - partial: partial payment received
// - unpaid: no payment received
```

### 3. **Customer Credit System** ✅

**Features:**
- Per-customer credit limits
- Credit balance tracking
- Limit enforcement with override capability
- Complete audit ledger
- Warning thresholds

**Roles & Permissions:**
- Salesman/Cashier: Create credit sales (within limit)
- Manager: Override limit approval
- Owner: Full credit management

**API:**
```typescript
const creditStatus = await getCustomerCreditStatus(customerId, businessId);
// Returns: { credit_limit, current_balance, available_credit, is_warning }

// Create credit sale
await createCreditSaleBill({
  customer_id: customerId,
  items: [...],
  total_amount: 2500
});

// Record payment
await recordCreditPayment(customerId, businessId, 1000);
```

### 4. **Expense Tracking & Profit Calculation** ✅

**Formula:**
```
Net Profit = Sales - Purchase Cost - Expenses

Where:
- Sales = SUM(bill.total_amount) WHERE status='completed'
- Purchase Cost = SUM(bill_item.cost_price * quantity)
- Expenses = SUM(expenses.amount)
```

**Accessibility:**
- Owner: Full access
- Manager: Full access
- Cashier: No access
- Salesman: No access

### 5. **Activity Logging System** ✅

**Logged Actions:**
- Bill operations (create, update, finalize, cancel)
- Product changes
- Stock adjustments
- Customer operations
- Expense entries
- Credit transactions
- Offline data syncs

**Data Captured:**
- Old value (before change)
- New value (after change)
- User ID
- Timestamp
- IP address
- Description

**Export:** CSV export with full audit trail

### 6. **Subscription Management** ✅

**Subscription States:**
- **trialing:** Free trial period
- **active:** Active subscription
- **expired:** Subscription past end date
- **cancelled:** Cancelled subscription

**Feature Restrictions:**
- Expired: Billing allowed, analytics locked, exports locked
- Trialing: Full access with warning
- Active: Full access

**Configuration:**
```typescript
const { isActive, isExpired, daysUntilExpiration } = useSubscriptionStatus(businessId);

// Show banner if expiring soon
if (daysUntilExpiration <= 7 && daysUntilExpiration > 0) {
  <SubscriptionBanner />
}

// Lock features if expired
if (isExpired) {
  disableAnalyticsExport();
}
```

### 7. **Offline Mode with Sync** ✅

**Capabilities:**
- Create bills offline
- Create customers offline
- Record expenses offline
- View cached products/customers
- Automatic sync when reconnected

**Storage:** IndexedDB (browser local storage)

**Sync Priority:**
1. Bills (critical)
2. Customers (important)
3. Expenses (important)
4. Other operations

**Conflict Resolution:**
- Stock mismatch detection
- Duplicate bill detection
- Last-write-wins default strategy
- Manual merge option for manager

---

## Implementation Details

### Database Initialization

**Run migrations in order:**
```sql
1. 202602260100_master_bundle_v1.sql       -- Core schema
2. 202602260500_advanced_features_v2.sql   -- Advanced features
```

### Initialization on New Business Creation

```sql
-- Auto-created when business is created
INSERT INTO payment_modes_config (...);
INSERT INTO customer_credit_settings (...);
INSERT INTO business_settings (
  enable_draft_stock_reservation = true,
  enable_split_payment = false,
  enable_customer_credit = true,
  enable_offline_mode = true
);
```

---

## API Reference

### Core RPC Functions (Supabase)

#### Split Payment
```typescript
// Add payment to existing bill
supabase.rpc('add_bill_payment', {
  _bill_id: UUID,
  _payment_mode: 'cash' | 'upi' | 'card' | 'credit',
  _amount: NUMERIC,
  _transaction_reference?: TEXT,
  _notes?: TEXT
})
```

#### Customer Credit
```typescript
// Get credit status
supabase.rpc('get_customer_credit_status', {
  _customer_id: UUID,
  _business_id: UUID
})

// Create credit bill
supabase.rpc('create_credit_sale_bill', {
  _business_id: UUID,
  _bill_number: TEXT,
  _customer_id: UUID,
  _items: JSONB,
  _total_amount: NUMERIC,
  _subtotal: NUMERIC,
  _discount_amount?: NUMERIC,
  _tax_amount?: NUMERIC
})
```

#### Expenses & Profit
```typescript
// Calculate profit for period
supabase.rpc('calculate_profit_summary', {
  _business_id: UUID,
  _start_date?: DATE,
  _end_date?: DATE
})
```

#### Offline Sync
```typescript
// Enqueue operation for sync
supabase.rpc('enqueue_offline_operation', {
  _business_id: UUID,
  _operation_type: TEXT,
  _table_name: TEXT,
  _record_id: UUID,
  _data: JSONB
})

// Process sync queue
supabase.rpc('process_offline_sync_queue', {
  _business_id: UUID
})
```

### REST API Endpoints

**Server-side handlers (to be implemented):**

```
POST /api/offline-sync
  - Process pending offline operations
  - Resolve conflicts
  - Sync cache data

GET /api/profit-report
  - Sales, cost, expense breakdown
  - Multi-period comparison

GET /api/activity-logs
  - Filtered audit trail
  - Export CSV

POST /api/bulk-operations
  - Batch create bills
  - Bulk stock adjustments
```

---

## Frontend Components

### Billing Module

**Location:** `src/components/billing/`

1. **SplitPaymentModal.tsx**
   - Multi-mode payment entry
   - Payment history display
   - Real-time calculation

2. **CustomerCreditDialog.tsx**
   - Credit status visualization
   - Warning indicators
   - Override request flow

### Feature Modules

**Location:** `src/components/`

```
expenses/
  ├─ ExpenseTracker.tsx        -- Expense entry & reporting
  └─ ProfitChart.tsx           -- Profit visualization

admin/
  ├─ ActivityLogs.tsx          -- Audit trail viewer
  ├─ PermissionBar.tsx         -- User role management
  └─ BusinessSettings.tsx      -- Feature toggles

sync/
  ├─ OfflineSyncStatus.tsx     -- Real-time sync indicator
  └─ SyncConflictResolver.tsx  -- Conflict UI

salesman/
  ├─ MobileQuickBilling.tsx    -- Mobile-optimized checkout
  └─ SalesmanDashboard.tsx     -- Mobile dashboard

subscription/
  └─ SubscriptionBanner.tsx    -- Status alerts
```

### Custom Hooks

**Location:** `src/hooks/useBillingSystem.ts`

```typescript
// All hooks in one place
useSplitPayment(billId)          -- Split payment management
useCustomerCredit(...)           -- Credit system operations
useExpenseTracking(...)          -- Expense & profit management
useActivityLogs(...)             -- Activity logging & export
useOfflineSync(...)              -- Offline sync status
useSubscriptionStatus(...)       -- Subscription validation
```

---

## Offline Sync System

### Architecture

```
┌─────────────────┐
│   Mobile App    │
│   (Salesman)    │
└────────┬────────┘
         │
    ┌────▼──────┐
    │  Online?  │
    └────┬──────┘
    ┌────┴──────────┐
    │               │
   YES              NO
    │               │
    ▼               ▼
   API         IndexedDB
  (Sync)      (Local Store)
    │               │
    └───────┬───────┘
            │
        ┌───▼────┐
        │ Sync?  │
        └───┬────┘
            │
            ▼
        [Upload
         Pending
         Ops]
```

### Implementation

**Location:** `src/lib/offlineSync.ts`

**Key Methods:**
```typescript
await offlineSyncManager.initialize(businessId, userId);

// Store operations offline
await offlineSyncManager.saveDraftBillOffline(billData);
await offlineSyncManager.saveExpenseOffline(expenseData);

// Retrieve pending operations
const pendingBills = await offlineSyncManager.getPendingBills();

// Trigger sync
await offlineSyncManager.syncPendingOperations();

// Storage stats
const stats = await offlineSyncManager.getStorageStats();
// { bills, customers, products, expenses, queue }
```

### Conflict Resolution Rules

**Stock Mismatch:**
```
Offline: product.stock = 100
Server:  product.stock = 80 (other user sold 20)

Resolution options:
1. Keep offline (use offline stock)
2. Use server (sync latest)
3. Manual merge (prompt manager)
```

**Duplicate Bill Detection:**
```
Check: bill_number unique per business
If conflict:
  - Add suffix: INV001_SYNC_1
  - Flag for manager review
```

---

## Security & RLS Policies

### Row Level Security (RLS)

**All tables have RLS enabled:**

```sql
-- Example: Products table
CREATE POLICY "Users can view products"
  ON products FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

CREATE POLICY "Admin/Manager can manage products"
  ON products FOR ALL TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid()) 
    AND public.is_admin_or_manager(auth.uid())
  );
```

### Helper Functions

```sql
-- Get user's business
get_user_business_id(user_id) RETURNS UUID

-- Role checks
is_admin_or_manager(user_id) RETURNS BOOLEAN
is_admin_or_staff(user_id) RETURNS BOOLEAN
has_role(user_id, role) RETURNS BOOLEAN
can_finalize_bill(user_id) RETURNS BOOLEAN

-- Subscription checks
check_subscription_active(business_id) RETURNS BOOLEAN
```

### Backend Validation

**Always validate server-side:**
```typescript
// ✅ DO: Server-side stock validation
const { data, error } = await supabase.rpc('create_draft_bill', {
  _items: items  // Validated in database function
});

// ❌ DON'T: Trust client-side calculations
const stockOk = items.every(i => i.quantity <= product.stock);
```

---

## Deployment Checklist

### Pre-Production

- [ ] Run all migrations in staging
- [ ] Test offline sync with poor network
- [ ] Verify RLS policies with test accounts
- [ ] Load test with concurrent bills
- [ ] Test credit system overrides
- [ ] Verify activity logging completeness
- [ ] Test subscription expiration flows
- [ ] Validate payment mode configurations
- [ ] Test all expense categories
- [ ] Verify profit calculations

### Production

- [ ] Backup production database
- [ ] Run migrations (in maintenance window)
- [ ] Update Supabase project version
- [ ] Enable monitoring & alerts
- [ ] Set up 24/7 on-call support
- [ ] Document known limitations
- [ ] Create runbooks for common issues
- [ ] Set up automated backups
- [ ] Configure DDoS protection
- [ ] Enable audit logging

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check sync success rates
- [ ] Validate offline mode usage
- [ ] Review activity logs
- [ ] Monitor subscription status
- [ ] Track payment success rates
- [ ] Gather user feedback

---

## Configuration Reference

### Business Settings (Enable/Disable Features)

```typescript
interface BusinessSettings {
  // Stock Management
  enable_draft_stock_reservation: boolean; // Default: true
  
  // Payment
  enable_split_payment: boolean;            // Default: false
  offline_sync_interval: number;            // Seconds, default: 300
  
  // Credit Management
  enable_customer_credit: boolean;          // Default: true
  require_manager_override_credit: boolean; // Default: true
  
  // Offline
  enable_offline_mode: boolean;             // Default: true
  
  // Display
  invoice_style: 'classic' | 'modern' | 'detailed';
  product_button_size: 'small' | 'medium' | 'large' | 'xlarge';
}
```

---

## Support & Troubleshooting

### Common Issues

**Issue: Offline operations not syncing**
- Check network connection
- Verify `offline_sync_queue` has pending status
- Check error_message in queue
- Manually trigger sync from UI

**Issue: Stock mismatch errors**
- Database function validation
- Enable draft stock reservation if needed
- Clear old sync conflicts

**Issue: Credit limit not enforced**
- Verify `enable_customer_credit = true`
- Check customer_credit_limits table initialization
- Verify credit warning threshold

**Issue: Activity logs not appearing**
- Check RLS policies (Owner/Manager only)
- Verify `log_activity()` calls in code
- Check database transaction completion

---

## Future Enhancements

1. **Multi-Currency Support**
2. **Advanced Inventory** (FIFO/LIFO)
3. **Subscription Payments** (Razorpay integration)
4. **Email Invoices** (Automated sending)
5. **Inventory Forecasting** (ML-based)
6. **Tax Reports** (GST/VAT compliance)
7. **Customer Portal** (Self-service)
8. **API for Third-parties** (Integration layer)

---

## Support Contact

For production issues: support@pos.example.com  
For technical questions: dev-support@pos.example.com

**Last Updated:** Feb 26, 2026  
**Maintained By:** POS Development Team
