# Invoice Adda — Pending Features Plan

> Last updated: April 11, 2026
> Total features: 8 across 4 phases

---

## Status Overview

| # | Feature | Phase | Effort | Status |
|---|---|---|---|---|
| 1 | PDF / Excel Export | Phase 1 | ~2 days | ✅ Done |
| 2 | Supplier / Vendor Management | Phase 2 | ~2 days | ✅ Done |
| 3 | Purchase / Stock-In Module | Phase 2 | ~4 days | ✅ Done |
| 4 | Reorder Alerts → Purchase Order | Phase 2 | ~2 days | ✅ Done |
| 5 | Sales Returns / Credit Notes | Phase 3 | ~3 days | ✅ Done |
| 6 | GSTR-1 / GSTR-3B Export | Phase 3 | ~3 days | ✅ Done |
| 7 | Customer Payment Reminders | Phase 4 | ~2 days | ✅ Done |
| 8 | Customer Loyalty Points | Phase 4 | ~3 days | ✅ Done |

---

## Phase 1 — Quick Win

### 1. PDF / Excel Export

**Goal:** Let owners download any report or data list as PDF or Excel.

**Pages affected:**
- Reports (Sales, Products, Customers, Expenses, P&L tabs)
- Bills History
- Activity Logs

**Libraries to install:**
```
npm install jspdf jspdf-autotable xlsx
```

**What to build:**
- Add "Export PDF" and "Export Excel" buttons on every report tab
- PDF: formatted table using `jspdf-autotable` with business name, date range in header
- Excel: multi-sheet workbook using `xlsx` (SheetJS)
- Bills History: export filtered results as Excel
- Activity Logs: export filtered logs as Excel/CSV

**New files:**
- `src/lib/exportPdf.ts` — reusable PDF export helper
- `src/lib/exportExcel.ts` — reusable Excel export helper

---

## Phase 2 — Purchase & Inventory

### 2. Supplier / Vendor Management

**Goal:** Track who the business buys stock from.

**New DB table:**
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**New page:** `/suppliers`
- Supplier list with search
- Add / Edit / Delete supplier
- View purchase history per supplier

**New files:**
- `src/pages/Suppliers.tsx`

---

### 3. Purchase / Stock-In Module

**Goal:** Record stock received from suppliers so `stock_quantity` updates automatically.

**New DB tables:**
```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  supplier_id UUID REFERENCES suppliers(id),
  order_number TEXT,
  status TEXT DEFAULT 'draft', -- draft | ordered | received | cancelled
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL,
  cost_price NUMERIC NOT NULL,
  total NUMERIC GENERATED ALWAYS AS (quantity * cost_price) STORED
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  product_id UUID REFERENCES products(id),
  movement_type TEXT, -- stock_in | stock_out | adjustment | return
  quantity NUMERIC NOT NULL,
  reference_id UUID, -- purchase_order_id or bill_id
  reference_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
```

**Flow:**
1. Create purchase order → select supplier → add products + quantities + cost price
2. Mark order as "Received" → `stock_quantity` increments for each product → movement logged in `stock_movements`
3. View stock movement history per product

**New pages:**
- `src/pages/Purchases.tsx` — purchase order list
- `src/pages/PurchaseOrderDetail.tsx` — create/view/receive a single order

---

### 4. Reorder Alerts → Purchase Order

**Goal:** Automatically alert when products are below threshold and allow one-click purchase order creation.

**How it works:**
- Dashboard widget: "Low Stock Products" list (already partially exists — extend it)
- Each low-stock product has a "Create Purchase Order" button
- Clicking it pre-fills a new purchase order with all low-stock products
- Owner selects supplier and submits

**New files:**
- `src/components/dashboard/ReorderWidget.tsx`

---

## Phase 3 — Compliance & GST

### 5. Sales Returns / Credit Notes

**Goal:** Handle returned goods — reverse stock, issue credit note.

**New DB tables:**
```sql
CREATE TABLE sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  original_bill_id UUID REFERENCES bills(id),
  return_number TEXT,
  return_date DATE DEFAULT CURRENT_DATE,
  reason TEXT,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending | approved | completed
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_return_id UUID REFERENCES sales_returns(id),
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  gst_rate NUMERIC DEFAULT 0,
  total NUMERIC
);

CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  sales_return_id UUID REFERENCES sales_returns(id),
  customer_id UUID REFERENCES customers(id),
  credit_note_number TEXT,
  amount NUMERIC NOT NULL,
  used_amount NUMERIC DEFAULT 0,
  is_fully_used BOOLEAN DEFAULT false,
  issued_at TIMESTAMPTZ DEFAULT now()
);
```

**Flow:**
1. Bills History → click bill → "Return Items" button
2. Select which items to return and quantity
3. Confirm → stock goes back up → credit note auto-created
4. Credit note is printable and can be applied as discount on next bill

**New page:** `src/pages/SalesReturns.tsx`

---

### 6. GSTR-1 / GSTR-3B Export

**Goal:** Generate GST filing reports in the exact format required by the Indian GST portal.

**New tab in Reports page:** "GST Filing"

**GSTR-1 sections:**
- **B2B** — Business to Business (customer has GSTIN): Invoice-wise detail
- **B2C Large** — B2C invoices above ₹2.5 lakh
- **B2C Small** — B2C invoices below ₹2.5 lakh (state-wise summary)
- **HSN Summary** — HSN/SAC code wise tax summary
- **Nil Rated / Exempt** — Zero-tax items

**GSTR-3B sections:**
- Outward supplies (taxable, zero-rated, exempt, nil-rated)
- Tax payable summary (IGST, CGST, SGST)

**Export:** Excel file with separate sheets per section, ready to upload to GST portal.

**New files:**
- `src/lib/gstCalculations.ts` — helper functions for B2B/B2C classification, HSN grouping
- `src/components/reports/GSTFilingTab.tsx`

---

## Phase 4 — Customer Retention

### 7. Customer Payment Reminders

**Goal:** Remind customers with outstanding dues via WhatsApp (no API key needed).

**How it works:**
- New "Reminders" tab on Due Bills page
- Shows list of customers with total outstanding amount
- Each row has a "Send WhatsApp Reminder" button
- Button opens `https://wa.me/<phone>?text=<prefilled message>` in browser/WhatsApp
- Prefilled message: *"Dear [Name], you have an outstanding payment of ₹[amount] at [Business Name]. Kindly clear your dues at the earliest. Thank you."*
- Log reminder sent (timestamp + user) in `activity_logs`

**No new DB tables needed** — uses existing `bills`, `customers`, `activity_logs`.

**New files:**
- `src/components/bills/PaymentReminderTab.tsx`

---

### 8. Customer Loyalty Points

**Goal:** Reward repeat customers with points that can be redeemed as discounts.

**New DB tables:**
```sql
CREATE TABLE loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  earn_rate NUMERIC DEFAULT 10,       -- points earned per ₹100 spent
  burn_rate NUMERIC DEFAULT 1,        -- ₹1 discount per N points
  min_redeem_points INTEGER DEFAULT 100,
  max_redeem_percent NUMERIC DEFAULT 20, -- max % of bill redeemable by points
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  customer_id UUID REFERENCES customers(id),
  bill_id UUID REFERENCES bills(id),
  transaction_type TEXT, -- earn | redeem | adjustment | expire
  points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Columns to add on `customers`:**
```sql
ALTER TABLE customers ADD COLUMN loyalty_points INTEGER DEFAULT 0;
```

**Flow:**
1. Settings → new "Loyalty" tab → enable/disable, set earn & burn rates
2. On bill finalization → points auto-calculated and added to customer balance
3. At billing → "Redeem Points" button in cart → applied as discount line item
4. Customer profile shows point balance + full transaction history

**New files:**
- `src/components/settings/tabs/LoyaltyTab.tsx`
- `src/components/billing/LoyaltyRedeemDialog.tsx`
- `src/pages/LoyaltyProgram.tsx` (optional — customer-facing summary)

---

## Build Order Recommendation

```
Phase 1 (PDF/Excel)     → Ship fast, immediate value
Phase 2 (Purchases)     → Biggest functional gap, do next
Phase 3 (GST/Returns)   → Required for compliance-focused businesses
Phase 4 (Retention)     → Growth & retention features last
```

---

## Removed Features (out of scope)

- ~~Barcode Scanner~~ — removed
- ~~Multiple Business Locations / Branches~~ — removed
- ~~Table / Order Management~~ — removed
- ~~Tally Export~~ — removed
- ~~Online Payment Links~~ — removed
- ~~WhatsApp Invoice Share~~ — removed (replaced by Payment Reminders using same wa.me approach)
