# Invoice Adda — Complete Project Documentation

> **Version:** 2.0 | **Last Updated:** April 18, 2026
> **Platform:** Web · Android · Windows Desktop

---

## Table of Contents

1. [What is Invoice Adda?](#what-is-invoice-adda)
2. [Why This Software?](#why-this-software)
3. [Who is it For?](#who-is-it-for)
4. [Technology Stack](#technology-stack)
5. [User Roles & Access Control](#user-roles--access-control)
6. [All Sections & Features](#all-sections--features)
   - [Dashboard](#1-dashboard)
   - [Billing (POS)](#2-billing-pos)
   - [Bills Management](#3-bills-management)
   - [Products & Categories](#4-products--categories)
   - [Customers](#5-customers)
   - [Suppliers & Purchases](#6-suppliers--purchases)
   - [Sales Returns](#7-sales-returns)
   - [Expenses](#8-expenses)
   - [Reports & Analytics](#9-reports--analytics)
   - [Settings](#10-settings)
   - [Activity Logs](#11-activity-logs)
   - [Super Admin Panel](#12-super-admin-panel)
7. [Salesman System (Complete Guide)](#salesman-system-complete-guide)
   - [Salesman Dashboard](#salesman-dashboard)
   - [Salesman Billing](#salesman-billing)
   - [Salesman My Orders](#salesman-my-orders)
   - [Salesman Stores](#salesman-stores)
   - [Salesman Targets](#salesman-targets)
   - [Salesman Orders (Owner View)](#salesman-orders-owner-view)
   - [Salesman Control (Owner View)](#salesman-control-owner-view)
8. [Database Schema](#database-schema)
9. [Billing Flow (Step by Step)](#billing-flow-step-by-step)
10. [GST & Tax System](#gst--tax-system)
11. [Export & Print](#export--print)
12. [Offline & Sync Support](#offline--sync-support)
13. [Feature Matrix by Role](#feature-matrix-by-role)

---

## What is Invoice Adda?

**Invoice Adda** is a complete **Point of Sale (POS) and Business Management** software designed for Indian small and medium businesses. It is a full-featured billing, inventory, customer management, expense tracking, and reporting platform — all in one application.

It runs as a **web app**, an **Android mobile app** (via Capacitor), and a **Windows desktop app** (via Electron), all from a single React codebase.

### Core Capabilities

| Area | What it Does |
|------|-------------|
| **Billing** | Create invoices, manage drafts, handle split payments (cash/UPI/card/credit), print receipts |
| **Inventory** | Track products, stock levels, categories, pricing (MRP/selling/cost/wholesale), low stock alerts |
| **Customers** | Customer directory, purchase history, outstanding dues, credit limits, loyalty points |
| **Purchases** | Supplier management, purchase orders, stock-in tracking, receiving |
| **Expenses** | Track business expenses by category, recurring expenses, analytics |
| **Reports** | Sales, P&L, item-wise, stock, customer, GST filing reports with charts and export |
| **GST Compliance** | GSTR-1 and GSTR-3B report generation, HSN/SAC classification, rate-wise tax summary |
| **Salesman Management** | Field salesman billing, store assignments, target tracking, order management |
| **Multi-role Access** | Owner, Manager, Cashier, Salesman — each with appropriate permissions |
| **SaaS Platform** | Super admin panel for managing businesses, subscriptions, and plans |

---

## Why This Software?

### The Problem

Indian small businesses face these challenges:

1. **Manual Billing** — Paper-based invoicing is slow, error-prone, and doesn't track inventory
2. **No GST Compliance** — Generating GSTR-1/GSTR-3B reports manually is tedious and mistake-prone
3. **No Inventory Visibility** — Business owners don't know what's in stock until it runs out
4. **No Sales Tracking** — No way to see daily revenue, profits, or top products
5. **Field Sales Chaos** — Salesmen take orders on paper, leading to missed orders and no accountability
6. **No Customer History** — Repeat customers aren't recognized, dues are forgotten
7. **Expensive Software** — Enterprise POS solutions cost ₹10,000–₹50,000/year and are complex
8. **No Mobile Access** — Most POS software is desktop-only, useless for field salesmen

### The Solution

Invoice Adda solves all of these:

- **Instant Billing** — Create professional GST-compliant invoices in seconds
- **Automatic Inventory** — Stock updates automatically when you sell or purchase
- **Real-time Dashboard** — See today's sales, revenue, and profit at a glance
- **Salesman App** — Field salesmen create orders on their phone, owner approves from anywhere
- **GST Reports** — One-click GSTR-1 and GSTR-3B Excel downloads ready for portal upload
- **Multi-platform** — Works on browser, Android phone, and Windows desktop
- **Affordable** — Built as SaaS with flexible subscription plans
- **Offline Support** — Works without internet, syncs when back online

---

## Who is it For?

| Business Type | How They Use It |
|---------------|-----------------|
| **Retail Shops** | Billing, inventory tracking, customer management |
| **Wholesale Distributors** | Salesman orders, bulk billing, purchase management |
| **Grocery / Kirana Stores** | Quick POS billing, stock alerts, due tracking |
| **Electronics / Hardware** | Product catalog with HSN codes, GST invoices |
| **Clothing / Fashion** | Category-wise products, discount management |
| **Restaurants / Cafes** | Quick billing, split payments |
| **Service Providers** | Service billing, customer tracking, expense management |
| **Pharma / Medical** | HSN/SAC codes, GST compliance, batch tracking (extensible) |

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | **React 18 + TypeScript** | UI framework with type safety |
| Routing | **React Router 6** | Client-side navigation (HashRouter) |
| State | **TanStack React Query 5** | Server state, caching, background refresh |
| UI Library | **shadcn/ui + Radix UI** | 50+ accessible, customizable components |
| Styling | **Tailwind CSS** | Utility-first responsive design |
| Icons | **Lucide React** | 1000+ clean SVG icons |
| Backend | **Supabase** | PostgreSQL database + Auth + Row Level Security |
| Offline | **IndexedDB (idb)** | Local data caching and offline queue |
| PDF Export | **jsPDF + jsPDF-autotable** | Invoice and report PDF generation |
| Excel Export | **xlsx + xlsx-js-style** | Styled multi-sheet Excel workbooks |
| Charts | **Recharts** | Analytics charts and graphs |
| Date Handling | **date-fns** | Date formatting and calculations |
| Notifications | **Sonner** | Toast notifications |
| Mobile App | **Capacitor** | Native Android wrapper |
| Desktop App | **Electron** | Native Windows wrapper |
| Build Tool | **Vite** | Lightning-fast dev server and bundler |

---

## User Roles & Access Control

Invoice Adda supports **5 user roles**, each with specific permissions:

### Owner
- **Full access** to everything
- Creates the business, manages staff, views all reports
- Can assign roles to team members
- Controls all settings and configurations

### Manager
- Nearly full access (configurable via `manager_full_access` setting)
- Can manage products, customers, billing, reports
- Can view salesman orders and finalize them
- Cannot delete the business or change owner

### Cashier
- **POS-focused** role
- Can create bills, manage cart, process payments
- Can view customers and their history
- Cannot access reports, settings, inventory management, or expenses

### Salesman
- **Field sales** role with mobile-optimized interface
- Creates draft orders (not finalized bills)
- Views only their own assigned stores and targets
- Cannot access reports, settings, or other salesmen's data
- Has a dedicated dashboard, billing, and stores interface

### Super Admin
- **Platform administrator** (separate login system)
- Manages all businesses on the platform
- Controls subscription plans and billing
- Views platform-wide analytics and logs
- Cannot create bills or manage individual business data

---

## All Sections & Features

---

### 1. Dashboard

**Route:** `/dashboard` | **Access:** All roles

The main home screen showing business performance at a glance.

**Available in this section:**

| Feature | Description |
|---------|-------------|
| **Today's Revenue** | Total sales amount for the current day |
| **Today's Bills** | Number of bills created today |
| **Today's Profit** | Net profit (revenue minus cost of goods sold) |
| **Monthly Revenue** | Running total for the current month |
| **Monthly Bills** | Bill count for the month |
| **Monthly Profit** | Monthly net profit |
| **Recent Bills** | Last 5 bills with status and amount |
| **Low Stock Alerts** | Products below their reorder threshold |
| **Salesman Orders (Today)** | Count and value of salesman-generated orders today |
| **Salesman Orders (Month)** | Count and value of salesman-generated orders this month |
| **Quick Actions** | Buttons for New Bill, Add Product, Add Customer |
| **Export to Excel** | Download daily or monthly KPIs as styled .xlsx |

---

### 2. Billing (POS)

**Route:** `/billing` | **Access:** Owner, Manager, Cashier

The point-of-sale screen where bills are created.

**Available in this section:**

| Feature | Description |
|---------|-------------|
| **3-Panel Layout** | Categories sidebar → Product grid → Cart |
| **Product Search** | Search by name across all categories |
| **Category Filter** | Browse products by category |
| **Quick Add** | Click product to add to cart (qty +1 per click) |
| **Quantity Editing** | +/- buttons or manual qty input |
| **Per-item Discount** | Apply discount % to individual items |
| **Bill-level Discount** | Apply overall discount to the bill |
| **Customer Selection** | Assign bill to existing or new customer |
| **GST Calculation** | Automatic tax computation (CGST+SGST or IGST) |
| **Split Payment** | Pay with multiple methods (cash + UPI + card + credit) |
| **Credit Check** | Warning when customer exceeds credit limit |
| **Loyalty Points** | Redeem customer loyalty points as discount |
| **Save as Draft** | Save incomplete bill for later |
| **Finalize Bill** | Complete the bill, generate bill number, update stock |
| **Print Invoice** | Thermal receipt (58mm) or A4/A5 invoice |
| **Bill Number Format** | Auto-generated with configurable prefix |
| **Stock Reservation** | Optional: reserve stock when draft is created |
| **Salesman Mode** | Simplified mobile billing for salesman role (ORD-prefix orders) |

---

### 3. Bills Management

**3a. Bills History** — Route: `/bills-history` | Access: Owner, Manager, Cashier

| Feature | Description |
|---------|-------------|
| **Complete Bill List** | All finalized bills with search and filters |
| **Date Range Filter** | Today, This Week, This Month, Custom |
| **Status Filter** | Completed, Due, Overdue |
| **Bill Details** | View full bill with line items, taxes, payment info |
| **Reprint** | Print any past bill as thermal or A4 invoice |
| **Delete Bill** | Remove bill (with confirmation, logged in activity) |
| **Export** | Download filtered bills as Excel/PDF |

**3b. Draft Bills** — Route: `/draft-bills` | Access: Owner, Manager, Cashier, Salesman

| Feature | Description |
|---------|-------------|
| **Draft List** | All unsaved/in-progress bills |
| **Resume Billing** | Continue where you left off |
| **Finalize** | Convert draft to completed bill |
| **Delete Draft** | Remove unwanted drafts |

**3c. Due Bills** — Route: `/due-bills` | Access: Owner, Manager

| Feature | Description |
|---------|-------------|
| **Outstanding Bills** | Bills with partial or no payment |
| **Record Payment** | Mark additional payments received |
| **Payment Reminders** | Send WhatsApp reminders to customers |
| **Due Amount Summary** | Total outstanding across all customers |
| **Customer-wise Dues** | Group dues by customer |

---

### 4. Products & Categories

**4a. Products** — Route: `/products` | Access: Owner, Manager

| Feature | Description |
|---------|-------------|
| **Product Catalog** | Full list with search, filter by category |
| **Add Product** | Name, description, category, prices, stock, GST%, HSN code |
| **4 Price Tiers** | MRP, Selling Price, Cost Price, Wholesale Price |
| **Stock Tracking** | Current quantity, reserved quantity, available stock |
| **Low Stock Threshold** | Set per-product reorder level |
| **Product Image** | Upload product photo |
| **Unit Types** | Pieces, Kg, Liter, Meter, Box, Dozen, etc. |
| **Items per Case** | For wholesale stock-in calculations |
| **Bulk Import** | CSV upload with validation (ProductImporter) |
| **Active/Inactive** | Toggle product availability |
| **Edit / Delete** | Modify or remove products |

**4b. Categories** — Route: `/categories` | Access: Owner, Manager

| Feature | Description |
|---------|-------------|
| **Category List** | All product categories with icons |
| **Add Category** | Name, icon, color, sort order |
| **Edit / Delete** | Modify or remove categories |
| **Drag Reorder** | Change display order |

---

### 5. Customers

**Route:** `/customers` | **Access:** Owner, Manager, Cashier, Salesman (limited)

| Feature | Description |
|---------|-------------|
| **Customer Directory** | Full list with search by name/phone |
| **Add Customer** | Name, phone, email, address, GSTIN, store name, store type, location, pincode |
| **Customer Profile** | View all details + purchase history |
| **Purchase History** | All bills for this customer |
| **Outstanding Balance** | Total due amount |
| **Credit Limit** | Set and monitor per-customer credit |
| **Credit Ledger** | Full credit transaction history |
| **Loyalty Points** | Points balance, earn/redeem history |
| **Assigned Salesman** | Link customer/store to field salesman |
| **CSV Import** | Bulk import customers (CustomerImporter) |
| **Edit / Delete** | Modify or remove customers |

---

### 6. Suppliers & Purchases

**6a. Suppliers** — Route: `/suppliers` | Access: Owner, Manager

| Feature | Description |
|---------|-------------|
| **Supplier Directory** | Vendor list with search |
| **Add Supplier** | Name, contact person, phone, email, address, GSTIN |
| **Purchase History** | All POs from this supplier |
| **Active/Inactive** | Toggle supplier status |
| **Edit / Delete** | Modify or remove suppliers |

**6b. Purchases** — Route: `/purchases` | Access: Owner, Manager

| Feature | Description |
|---------|-------------|
| **Purchase Order List** | All POs with status (Draft, Ordered, Received, Cancelled) |
| **Create PO** | Select supplier → add products + quantities + cost price |
| **Receive PO** | Mark as received → stock auto-increments |
| **PO Detail View** | View/edit individual purchase order items |
| **Stock Movement** | Auto-logged when PO received |
| **Reorder Alerts** | Low-stock products suggest creating PO |

---

### 7. Sales Returns

**Route:** `/sales-returns` | **Access:** Owner, Manager

| Feature | Description |
|---------|-------------|
| **Return List** | All sales returns with status |
| **Create Return** | Select original bill → choose items to return |
| **Return Reasons** | Track why items were returned |
| **Stock Restoration** | Returned items auto-added back to inventory |
| **Credit Notes** | Auto-generated credit note for the customer |
| **Return History** | Full audit trail of returns |

---

### 8. Expenses

**Route:** `/expenses` | **Access:** Owner, Manager

| Feature | Description |
|---------|-------------|
| **Expense Dashboard** | Charts showing spending by category and over time |
| **Add Expense** | Amount, date, category, subcategory, description, payment method |
| **Expense Categories** | Rent, Salary, Utilities, Transport, Marketing, etc. (customizable) |
| **Subcategories** | Drill-down categorization |
| **Receipt Upload** | Attach receipt image to expense |
| **Recurring Expenses** | Auto-create daily/weekly/monthly expenses (rent, salaries) |
| **Expense Logs** | Full transaction history with filters |
| **Reports** | Monthly summaries, category breakdown |
| **P&L Impact** | Expenses deducted from revenue in Profit & Loss report |

---

### 9. Reports & Analytics

**Route:** `/reports` | **Access:** Owner, Manager

Six report tabs with charts, date filters, and export:

| Report | What It Shows |
|--------|--------------|
| **Sales Report** | Daily/weekly/monthly revenue trends, line + area charts, total revenue/bills/average bill |
| **Profit & Loss** | Revenue − Expenses = Profit, gross margin %, monthly comparison |
| **Item-wise Report** | Top products by quantity and revenue, category breakdown |
| **Stock Report** | Current stock levels, low-stock alerts, overstock items, category distribution |
| **Party-wise Report** | Top customers by sales, purchase frequency, outstanding dues |
| **GST Filing** | GSTR-1 (B2B, B2C, HSN summary) and GSTR-3B (tax summary), Excel export ready for GST portal |

**Date Presets:** Today, This Week, This Month, This Quarter, This Year, Custom Range

**Export Formats:** PDF (formatted tables with header), Excel (multi-sheet styled workbooks), CSV

---

### 10. Settings

**Route:** `/settings` | **Access:** Owner, Manager (partial)

Eight configuration tabs:

| Tab | What You Can Configure |
|-----|----------------------|
| **Business** | Business name, logo, address, phone, email, GSTIN, bank account details, UPI ID |
| **Billing** | Default GST %, tax type (CGST+SGST vs IGST), bill number prefix, auto-numbering, discount rules, rounding rules |
| **Categories** | Manage product categories (same as Categories page) |
| **Staff** | Add/remove team members, assign roles (Owner/Manager/Cashier/Salesman), set bill prefix per user, toggle manager full access |
| **Print Config** | 60+ settings: invoice template (Classic/Modern/Thermal), page size (A4/A5/Thermal 58mm), company info display, font sizes, margins, table columns, footer text, QR code, bank details on invoice |
| **POS** | Display density (Compact/Regular/Spacious), visible columns in POS grid, product sort order, auto-quantity popup, default view |
| **App Theme** | 10 color themes: Mint Pro, Sunset Orange, Royal Purple, Ocean Blue, Rose Gold, Slate Modern, Dark Pro, Cyber Neon, Forest Deep, Midnight Blue |
| **Loyalty** | Enable/disable loyalty program, points earn rate (points per ₹100), redemption value, minimum redeem threshold, max redemption % per bill |

---

### 11. Activity Logs

**Route:** `/activity-logs` | **Access:** Owner, Manager

| Feature | Description |
|---------|-------------|
| **Audit Trail** | Every action logged with user, timestamp, and details |
| **Action Types** | Create/edit/delete bills, products, customers, expenses |
| **Before & After** | Old and new values for edits |
| **User Tracking** | Which staff member performed each action |
| **Search & Filter** | Filter by action type, user, date range |
| **Export** | Download logs as Excel/CSV |

---

### 12. Super Admin Panel

**Route:** `/super-admin` | **Access:** Super Admin only (separate login)

| Tab | What It Shows |
|-----|--------------|
| **Dashboard** | Platform analytics: total businesses, active users, MRR, subscription stats |
| **Businesses** | All registered businesses, suspend/activate, view profile details |
| **Subscriptions** | Active plans, expirations, trial conversions, billing history |
| **Users** | All users across businesses, roles, last login |
| **Plans** | Create/edit subscription plans, define features and pricing |
| **Logs** | Platform-wide audit trail, admin actions |

---

## Salesman System (Complete Guide)

The salesman system is a dedicated module for businesses with field sales teams. It provides salesmen with a mobile-optimized interface to create orders, manage assigned stores, and track their performance against targets.

---

### Salesman Dashboard

**Route:** `/salesman-dashboard` | **Access:** Salesman only

The personal home screen for every salesman.

| Feature | Description |
|---------|-------------|
| **Today's Orders** | Number of orders created today |
| **Today's Revenue** | Total order value for today |
| **Monthly Orders** | Orders created this month |
| **Monthly Revenue** | Total order value for this month |
| **Target Progress** | Current month's target with progress bar (amount + bill count) |
| **Assigned Stores** | Quick count of assigned customer stores |
| **Recent Orders** | Last 5 orders with status (Pending/Finalized) |
| **Quick Actions** | New Order, View Stores, My Orders |

---

### Salesman Billing

**Route:** `/salesman-billing` | **Access:** Salesman only

A **mobile-optimized** billing interface designed for use on phone while visiting stores.

| Feature | Description |
|---------|-------------|
| **Customer Selection** | Pick from assigned stores or search all customers |
| **Product Search** | Search products by name |
| **Category Browse** | Browse by product category |
| **Quick Add to Cart** | Tap product to add, tap again to increase quantity |
| **Quantity Edit** | +/- buttons for each cart item |
| **Price Display** | Shows selling price per product |
| **GST Auto-calculation** | Tax computed automatically |
| **Order Number** | Auto-generated: `ORD-{PREFIX}-MMDD0001` format |
| **Save as Draft Order** | Creates a draft bill (not finalized — owner/manager approves) |
| **Cart Summary** | Subtotal, tax, discount, total |
| **Touch-Friendly UI** | Large buttons, swipe actions, mobile-first design |

**Bill Number Format:** `ORD-{PREFIX}-MMDD0001`
- `ORD` = Salesman order identifier
- `{PREFIX}` = Salesman's personal bill prefix (assigned by owner in Staff settings)
- `MMDD` = Month and day
- `0001` = Sequential counter per day

---

### Salesman My Orders

**Route:** `/salesman-my-orders` | **Access:** Salesman only

Personal order history for the logged-in salesman.

| Feature | Description |
|---------|-------------|
| **KPI Cards** | Total orders, pending count, finalized count, total revenue |
| **Date Filters** | Today (default), This Week, This Month, All Time |
| **Order List** | All personal orders with bill number, customer, amount, status |
| **Status Badges** | Pending (amber) or Finalized (green) |
| **See More** | Initially shows 10 orders, expand to see all |
| **Search** | Search by order number or customer name |
| **Order Details** | Tap to view full order with line items |

---

### Salesman Stores

**Route:** `/salesman-stores` | **Access:** Salesman only

View and manage assigned customer stores.

| Feature | Description |
|---------|-------------|
| **Store List** | All assigned customers/stores with avatars |
| **Search** | Search by store name or phone |
| **Filter by Store Type** | Retail, Wholesale, Distributor, etc. |
| **Filter by Area** | Filter by location name |
| **Filter by Pincode** | Filter by postal code |
| **Add Customer** | Create new customer directly |
| **Store Detail Popup** | Tap store to see full details |
| **Contact Info** | Phone, email, address |
| **Store Stats** | Order count, total value, last order date |
| **Order History** | All orders for this store in scrollable list |
| **New Order** | Button to create order for this store |
| **Quick Actions** | Call, navigate to store |

---

### Salesman Targets

**Route:** `/salesman-targets` | **Access:** Salesman only

Track sales performance against assigned targets.

| Feature | Description |
|---------|-------------|
| **Current Target** | This month's active target |
| **Amount Target** | Target revenue with progress bar |
| **Bills Target** | Target order count with progress bar |
| **Finalized vs Pending** | Breakdown of finalized and pending amounts |
| **Date Range** | Target period (start date – end date) |
| **Past Targets** | History of previous month's targets |
| **Achievement Status** | Visual indicator of target completion |

---

### Salesman Orders (Owner View)

**Route:** `/salesman-orders` | **Access:** Owner, Manager

The **owner/manager's view** of all salesman-generated orders. This is where draft orders are reviewed and finalized.

| Feature | Description |
|---------|-------------|
| **Overview KPIs** | Total salesmen count, pending orders, finalized orders |
| **Salesman List** | Left panel showing all salesmen with order counts |
| **Salesman Detail** | Right panel showing selected salesman's info |
| **Target Progress** | Current month target with amount and bill progress bars |
| **Date Filters** | Today (default), This Week, This Month, All Time |
| **Status Filters** | All, Pending, Finalized |
| **Search Orders** | Search by order number or customer name |
| **Filtered Summary** | Live stats: order count, total value, pending count, finalized count |
| **Mobile Card View** | Touch-friendly cards on mobile screens |
| **Desktop Table View** | Full table with Order #, Customer, Amount, Status, Date, Action |
| **Finalize Button** | One-click to convert pending order to completed bill |
| **See More** | Shows 15 orders initially, expand to see all |
| **Export to Excel** | Download filtered orders as styled .xlsx with summary sheet |

---

### Salesman Control (Owner View)

**Route:** `/salesman-control` | **Access:** Owner, Manager

Manage salesman team and performance.

| Feature | Description |
|---------|-------------|
| **Salesman List** | All salesmen with roles and join dates |
| **Performance Summary** | Orders, revenue, and target achievement per salesman |
| **Assign Stores** | Link customers/stores to salesmen |
| **Set Targets** | Create monthly/weekly targets (amount + bill count) |
| **Export Orders** | Download all salesman orders as styled .xlsx |
| **Salesman Settings** | Configure salesman-specific features |

### Owner Settings for Salesman

Configurable in **Settings → Business** and **Settings → Staff**:

| Setting | What It Does |
|---------|-------------|
| `share_quantity_to_salesman` | Show/hide stock quantities in salesman's billing screen |
| `allow_salesman_price_edit` | Let salesmen edit product prices or lock them |
| `bill_prefix` (per user) | Personal prefix for salesman order numbers (e.g., ORD-HK-04180001) |
| `role` assignment | Assign salesman role to a team member |

---

## Database Schema

The application uses **Supabase (PostgreSQL)** with **30+ tables** organized into these groups:

### Core Tables
| Table | Purpose |
|-------|---------|
| `businesses` | Multi-tenant business containers |
| `profiles` | User display names and avatars |
| `user_roles` | Role-based access (owner/manager/cashier/salesman) per business |
| `business_settings` | 60+ configuration fields per business |

### Billing Tables
| Table | Purpose |
|-------|---------|
| `bills` | Sales invoices (draft/completed/due/overdue/cancelled) |
| `bill_items` | Line items for each bill |
| `bill_payments` | Split payment records (cash/UPI/card/credit) |
| `payment_modes_config` | Enabled payment methods per business |

### Inventory Tables
| Table | Purpose |
|-------|---------|
| `products` | Product catalog with pricing and stock |
| `categories` | Product categories |
| `inventory_logs` | Stock change audit trail |

### Customer Tables
| Table | Purpose |
|-------|---------|
| `customers` | Customer directory with store details |
| `customer_credit_limits` | Per-customer credit limits |
| `customer_credit_ledger` | Credit transaction history |
| `loyalty_points` | Customer loyalty point balances |

### Purchase Tables
| Table | Purpose |
|-------|---------|
| `suppliers` | Vendor registry |
| `purchase_orders` | Purchase orders with status tracking |
| `purchase_order_items` | PO line items |

### Returns Tables
| Table | Purpose |
|-------|---------|
| `sales_returns` | Return header records |
| `return_items` | Returned item details |
| `credit_notes` | Credit memos issued for returns |

### Expense Tables
| Table | Purpose |
|-------|---------|
| `expenses` | Expense entries |
| `expense_categories` | Custom expense categories |
| `expense_subcategories` | Category drill-downs |

### Salesman Tables
| Table | Purpose |
|-------|---------|
| `salesman_stores` | Customer-to-salesman assignments |
| `salesman_targets` | Monthly/weekly sales targets |

### Platform Tables
| Table | Purpose |
|-------|---------|
| `subscription_plans` | SaaS plan definitions |
| `subscriptions` | Business subscription records |
| `super_admins` | Platform admin registry |
| `super_admin_credentials` | Admin login credentials |
| `admin_logs` | Platform audit trail |
| `activity_logs` | Business-level audit trail |

### Sync Tables
| Table | Purpose |
|-------|---------|
| `offline_sync_queue` | Pending offline operations |
| `offline_data_cache` | Local data snapshots |
| `sync_conflicts` | Conflict resolution records |

---

## Billing Flow (Step by Step)

### Owner/Manager/Cashier Flow

```
1. Open Billing page (/billing)
2. Select or create customer (optional for walk-in)
3. Browse products by category or search
4. Click product to add to cart (qty: 1)
5. Adjust quantities with +/- buttons
6. Apply per-item discounts (optional)
7. Apply bill-level discount (optional)
8. Review cart: subtotal + GST + discount = total
9. Choose payment method:
   a. Cash → enter amount, see change
   b. UPI → optional transaction ref
   c. Card → optional transaction ref
   d. Credit → checks customer credit limit
   e. Split → combine multiple methods
10. Save as Draft (resume later) OR Finalize Bill
11. On Finalize:
    - Bill number auto-generated (PREFIX-0001)
    - Stock quantities deducted
    - Profit calculated (selling price − cost price)
    - Activity logged
    - Loyalty points awarded (if enabled)
12. Print thermal receipt or A4 invoice
```

### Salesman Flow

```
1. Salesman opens Salesman Billing (/salesman-billing)
2. Selects customer from assigned stores
3. Adds products to cart (mobile-friendly UI)
4. Cart shows subtotal + GST = total
5. Saves as Draft Order (ORD-{PREFIX}-MMDD0001)
6. Order appears in owner's Salesman Orders page
7. Owner reviews and clicks "Finalize"
8. Order converted to completed bill
9. Stock deducted, profit recorded
10. Counts toward salesman's target
```

---

## GST & Tax System

### Configuration
- **Business-level GST %** — Default rate applied to all products
- **Per-product GST %** — Overrides the business default
- **Tax Type** — CGST + SGST (intra-state) or IGST (inter-state)
- **HSN/SAC Code** — Standard classification per product

### Calculation
```
For CGST + SGST (intra-state):
  Tax = (Subtotal − Discount) × GST%
  CGST = Tax / 2
  SGST = Tax / 2

For IGST (inter-state):
  IGST = (Subtotal − Discount) × GST%
```

### GST Filing Reports
- **GSTR-1**: B2B invoices, B2C Large (>₹2.5L), B2C Small, HSN Summary, Nil/Exempt
- **GSTR-3B**: Outward supplies, tax payable (IGST/CGST/SGST), input tax
- **Export**: One-click download as formatted Excel, upload-ready for GST portal

---

## Export & Print

### Print Templates
| Template | Use Case |
|----------|----------|
| **Thermal Receipt** | 58mm thermal printer (compact receipt) |
| **Classic Invoice** | Standard A4/A5 tax invoice |
| **Urban/Modern Invoice** | Styled professional invoice |

### Export Formats
| Format | Usage |
|--------|-------|
| **PDF** | Invoices, reports (jsPDF + autotable) |
| **Excel (.xlsx)** | Multi-sheet styled workbooks with summary sheets |
| **CSV** | Raw data export for external tools |

### What Can Be Exported
- Bills History, Draft Bills, Due Bills
- Sales/P&L/Item/Stock/Customer reports
- GST Filing reports (GSTR-1, GSTR-3B)
- Salesman orders and performance data
- Dashboard KPIs (daily + monthly)
- Activity Logs
- Expense data

---

## Offline & Sync Support

| Feature | Description |
|---------|-------------|
| **IndexedDB Cache** | Products, customers, categories cached locally |
| **Offline Queue** | Operations saved locally when internet is down |
| **Auto Sync** | Queued operations sync when connection restores |
| **Conflict Resolution** | Detects and resolves data conflicts between offline edits |
| **Sync Status Indicator** | Visual badge showing sync status in the app |

---

## Feature Matrix by Role

| Feature | Owner | Manager | Cashier | Salesman | Super Admin |
|---------|:-----:|:-------:|:-------:|:--------:|:-----------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ (personal) | ✅ (platform) |
| Billing (POS) | ✅ | ✅ | ✅ | ✅ (mobile) | ❌ |
| Bills History | ✅ | ✅ | ✅ | ❌ | ❌ |
| Draft Bills | ✅ | ✅ | ✅ | ✅ (own) | ❌ |
| Due Bills | ✅ | ✅ | ❌ | ❌ | ❌ |
| Products | ✅ | ✅ | ❌ | ❌ | ✅ (view) |
| Categories | ✅ | ✅ | ❌ | ❌ | ❌ |
| Customers | ✅ | ✅ | ✅ | ✅ (limited) | ✅ (view) |
| Suppliers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Purchases | ✅ | ✅ | ❌ | ❌ | ❌ |
| Sales Returns | ✅ | ✅ | ❌ | ❌ | ❌ |
| Expenses | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ❌ | ✅ (platform) |
| Settings | ✅ | ✅ (partial) | ❌ | ❌ | ✅ (platform) |
| Activity Logs | ✅ | ✅ | ❌ | ❌ | ✅ (platform) |
| Salesman Orders | ✅ | ✅ | ❌ | ❌ | ❌ |
| Salesman Control | ✅ | ✅ | ❌ | ❌ | ❌ |
| My Orders | ❌ | ❌ | ❌ | ✅ | ❌ |
| My Stores | ❌ | ❌ | ❌ | ✅ | ❌ |
| My Targets | ❌ | ❌ | ❌ | ✅ | ❌ |
| Salesman Dashboard | ❌ | ❌ | ❌ | ✅ | ❌ |
| Super Admin Panel | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Summary

**Invoice Adda** is a production-ready, full-featured POS and business management platform that covers:

- **Billing & Invoicing** — Fast POS with GST compliance
- **Inventory Management** — Products, stock, purchases, suppliers
- **Customer Management** — Directory, credit, loyalty, dues
- **Field Sales** — Salesman app with orders, stores, targets
- **Financial Tracking** — Expenses, P&L, daily/monthly reporting
- **GST Compliance** — GSTR-1 and GSTR-3B export
- **Multi-platform** — Web, Android, Windows Desktop
- **Multi-role** — Owner, Manager, Cashier, Salesman, Super Admin
- **Export Everything** — PDF, Excel, CSV for any data
- **Offline Ready** — Works without internet

Built with modern technologies (React, TypeScript, Supabase, Tailwind) for performance, reliability, and beautiful UI across all devices.
