# Invoice Adda — Project Structure Notes

Quick reference for what every folder and file does. Read this first when exploring the codebase.

---

## Root Files

| File | What it does |
|------|-------------|
| `electron.cjs` | **Windows desktop entry point.** Creates the Electron BrowserWindow, loads `dist/index.html`. Used by `electron-builder` to make the `.exe` installer. |
| `index.html` | HTML shell Vite uses. Just mounts `<div id="root">`. |
| `vite.config.ts` | Vite build config. Aliases `@` → `src/`. |
| `tailwind.config.ts` | Tailwind setup — dark mode via `class`, custom colors, font, animations. |
| `postcss.config.js` | PostCSS setup for Tailwind. |
| `tsconfig.json` | Root TypeScript config (references app + node configs). |
| `tsconfig.app.json` | TS config for the React app source (`src/`). |
| `tsconfig.node.json` | TS config for Node tooling (vite.config, electron.cjs). |
| `capacitor.config.ts` | Capacitor config for Android build. App name: **Invoice Adda**, bundleId: `com.invoiceadda.app`. |
| `components.json` | shadcn/ui config — base color, CSS variables, component output path. |
| `package.json` | Dependencies, scripts. `productName: "Invoice Adda"`. Build targets: Vite web, Electron Windows, Capacitor Android. |
| `eslint.config.js` | ESLint rules for the project. |
| `vercel.json` | Vercel deployment config — SPA fallback (`/*` → `/index.html`). |
| `schema.sql` | Full Supabase database schema dump (for reference / fresh setup). |
| `db.sql` | Alternative/older DB snapshot. |
| `plan.md` | High-level feature documentation for the entire app. |
| `PROJECT_STRUCTURE.md` | **This file.** Folder + file map. |
| `vitest.config.ts` | Vitest test runner config. |

---

## `src/` — Application Source

### Entry Points

| File | What it does |
|------|-------------|
| `main.tsx` | React app entry. Mounts `<App>` into `#root`. Wraps with `QueryClientProvider` + `AuthProvider` + `ThemeProvider`. |
| `App.tsx` | Root component. Defines all routes via React Router. Maps URL paths to page components. |
| `App.css` | Global app styles (mostly reset / base). |
| `index.css` | Tailwind directives + CSS custom properties for the theme system (light/dark color vars, sidebar vars). |
| `vite-env.d.ts` | TypeScript declarations for Vite `import.meta.env`. |

---

### `src/pages/` — Full-Page Views

Each file is a full page rendered by React Router.

| File | Route / What it shows |
|------|----------------------|
| `Index.tsx` | `/` — Redirect to `/dashboard` if logged in, else to `/auth`. |
| `Auth.tsx` | `/auth` — Login + signup form. Handles Supabase auth. |
| `BusinessSetup.tsx` | `/business-setup` — First-run wizard after signup. Collect business name, type, GST. |
| `Dashboard.tsx` | `/dashboard` — KPI cards (today's sales, bills, profit), recent bills list, low stock alerts. |
| `Billing.tsx` | `/billing` — Main POS screen. Three panels: product catalog, cart, bill summary + payment. |
| `SalesmanBilling.tsx` | `/salesman-billing` — Simplified billing screen for salesman role (no reports/settings access). |
| `BillsHistory.tsx` | `/bills-history` — List of all completed bills. Filter by date, search, view/print/delete. |
| `DraftBills.tsx` | `/draft-bills` — Incomplete (held) bills saved for later. Resume or delete. |
| `DueBills.tsx` | `/due-bills` — Bills with outstanding balance (partial payment). Mark as paid. |
| `Products.tsx` | `/products` — Product catalog. Add/edit/delete products, manage stock. |
| `Categories.tsx` | `/categories` — Product categories with color/icon. CRUD. |
| `Customers.tsx` | `/customers` — Customer list. Add/edit, view purchase history, credit balance. |
| `ManageCustomers.tsx` | `/manage-customers` — Admin view of all customers across businesses (super-admin use). |
| `ManageProducts.tsx` | `/manage-products` — Admin view of all products across businesses. |
| `Expenses.tsx` | `/expenses` — Expense tracker wrapper, renders `<ExpenseTracker>`. |
| `Reports.tsx` | `/reports` — Sales analytics: revenue chart, top products, category breakdown, date range filter. |
| `Settings.tsx` | `/settings` — Settings shell. Tabs: Business, Billing, POS, Staff, Theme, Print, Invoices, Subscription. |
| `ActivityLogs.tsx` | `/activity-logs` — Audit log. Shows who did what (create/edit/delete bill, product, etc.). |
| `SuperAdmin.tsx` | `/super-admin` — Super-admin dashboard. Manage all businesses, plans, subscriptions. |
| `SuperAdminLogin.tsx` | `/super-admin-login` — Separate login for super-admin access. |
| `NotFound.tsx` | `*` — 404 page. |

---

### `src/contexts/` — Global State Providers

| File | What it provides |
|------|-----------------|
| `AuthContext.tsx` | `useAuth()` — current user, businessId, role (`owner/manager/staff/viewer`), `signIn()`, `signOut()`, session state. Wraps the whole app. |
| `ThemeContext.tsx` | `useTheme()` — active theme name, `setTheme()`. Applies CSS variable overrides to `document.documentElement` whenever theme changes. Persists to `business_settings`. |

---

### `src/hooks/` — Custom React Hooks

| File | What it does |
|------|-------------|
| `useBusinessSettings.ts` | `useBusinessSettings()` — fetches the `business_settings` row for the current business. `useUpdateBusinessSettings()` — saves any fields back to Supabase. Used by every settings tab. |
| `useBillingSystem.ts` | The core billing hook. Manages cart (add/remove/qty), applies GST/discount/rounding, handles payment modes (cash, UPI, card, split), saves bill to Supabase, prints invoice. |
| `useExpenseManagement.ts` | CRUD hook for the `expenses` table. `addExpense()`, `updateExpense()`, `deleteExpense()`. Used by `ExpenseTracker`. |
| `usePosLayout.ts` | Persists POS screen layout preferences (columns, density, sort order) to `business_settings`. |
| `useSubscription.ts` | Fetches subscription plan details for the business. Guards premium features. |
| `use-mobile.tsx` | Returns `true` if viewport width < 768px. Used for responsive layout switches. |
| `use-toast.ts` | shadcn/ui toast state management (re-exported from `components/ui/`). |

---

### `src/lib/` — Utilities & API Layer

| File | What it does |
|------|-------------|
| `utils.ts` | `cn()` — class name helper (clsx + tailwind-merge). Used everywhere. |
| `exportToExcel.ts` | Generates and downloads `.xlsx` files from bill / expense / report data. Uses `xlsx` library. |
| `offlineSync.ts` | Queues Supabase writes to `localStorage` when offline. Replays queue when connection restores. |
| `api/advancedBillingApi.ts` | Supabase RPC wrappers for complex billing operations (split payment, due balance, bulk item insert). |

---

### `src/integrations/supabase/`

| File | What it does |
|------|-------------|
| `client.ts` | Creates and exports the singleton Supabase JS client with project URL + anon key from `import.meta.env`. |
| `types.ts` | Auto-generated TypeScript types for every Supabase table and RPC function. Source of truth for DB shape. |

---

### `src/components/` — Feature Components

#### `layout/`
| File | What it does |
|------|-------------|
| `AppLayout.tsx` | Main shell rendered for all authenticated pages. Sidebar navigation + top bar + content area. Handles sidebar collapse, mobile drawer, theme-aware colors. |
| `SuperAdminLayout.tsx` | Minimal shell for super-admin pages (different nav, no business sidebar). |

#### `auth/`
| File | What it does |
|------|-------------|
| `ProtectedRoute.tsx` | Wraps private routes — redirects to `/auth` if not logged in. |
| `DisplayNamePrompt.tsx` | Modal shown after first login asking for the user's display name. |

#### `billing/`
| File | What it does |
|------|-------------|
| `MobileCatalog.tsx` | Product grid optimized for mobile/tablet on the POS screen. Touch-friendly large cards. |
| `SplitPaymentModal.tsx` | Dialog to split a bill across Cash + UPI + Card. Shows totals per method. |
| `CustomerCreditDialog.tsx` | Dialog to apply customer credit balance to the current bill. |

#### `bills/`
| File | What it does |
|------|-------------|
| `InvoiceTemplate.tsx` | Standard A4/letter invoice layout used for printing regular bills. |
| `ThermalTemplate.tsx` | Narrow 80mm thermal receipt layout for thermal printers. |
| `UrbanBillTemplate.tsx` | Modern stylized invoice template (alternative to default). |
| `BillReceiptPrint.tsx` | Wrapper that picks the right template based on print settings and triggers `window.print()`. |
| `BillDetailsDialog.tsx` | Modal showing full bill details — items, taxes, payments, timestamps. |
| `DraftBillModal.tsx` | Dialog for naming and saving a bill as a draft. |

#### `expenses/`
| File | What it does |
|------|-------------|
| `ExpenseTracker.tsx` | Full expense management UI. Wraps all expense tabs. |
| `DashboardTab.tsx` | Expense summary — totals by category, monthly trend chart. |
| `EntryTab.tsx` | Add / edit expense form. Category, amount, date, payment method, notes. |
| `CategoriesTab.tsx` | Manage expense categories (rename, color, icon). |
| `RecurringTab.tsx` | Set up recurring expenses (auto-add monthly/weekly entries). |
| `LogsTab.tsx` | Full expense history table with filter, search, export. |

#### `settings/`
| File | What it does |
|------|-------------|
| `SettingsUI.tsx` | **Shared primitives** for settings tabs: `SettingsCard`, `Toggle`, `SettingRow`, `ButtonGroup`, `TabBar`, etc. |
| `PrintSettingsTab.tsx` | Print configuration — A4 invoice layout + thermal receipt layout. Live preview. Font, size, colors, margins, borders, labels, logo, UPI QR. |
| `InvoicesTab.tsx` | Invoice template selector — choose between Standard, Urban, or Thermal as default. |
| `SubscriptionManagement.tsx` | Shows current plan, usage stats, upgrade options. |

#### `settings/tabs/`
| File | What it does |
|------|-------------|
| `BusinessTab.tsx` | Business name, address, logo, GST, bank details, UPI ID. |
| `BillingTab.tsx` | Tax mode, default GST %, bill number format, discount rules, round-off toggle. |
| `POSTab.tsx` | POS screen layout: columns, density, sort order, quick-add mode, auto-focus. |
| `StaffTab.tsx` | Invite/remove staff, assign roles (staff / viewer). Admin-only. |
| `AppThemeTab.tsx` | Visual theme picker. ☀️ Light Themes (7) and 🌙 Dark Themes (3). |
| `CategoriesTab.tsx` | Product categories CRUD inside settings (duplicate of Categories page but inline). |

#### `admin/`
| File | What it does |
|------|-------------|
| `ActivityLogs.tsx` | Activity log component (renders on the ActivityLogs page and inside admin/super-admin). |

#### `super-admin/`
| File | What it does |
|------|-------------|
| `DashboardTab.tsx` | Super-admin overview: total businesses, active subscriptions, MRR. |
| `UsersTab.tsx` | List all users/businesses. Search, view details, impersonate. |
| `BusinessProfile.tsx` | Detailed view of a single business (plan, owner, bills count). |
| `BusinessTab.tsx` | Edit a business's core info from super-admin. |
| `PlansTab.tsx` | Manage subscription plans (Free, Pro, Enterprise) — pricing, feature limits. |
| `SubscriptionTab.tsx` | View/change a business's active subscription. |
| `LogsTab.tsx` | System-wide audit logs across all businesses. |

#### `salesman/`
| File | What it does |
|------|-------------|
| `MobileQuickBilling.tsx` | Simplified mobile billing UI for salesman role. No settings or reports. |

#### `sync/`
| File | What it does |
|------|-------------|
| `SyncAndSubscriptionStatus.tsx` | Floating indicator showing online/offline sync status and subscription badge. |

#### `ui/`
Standard **shadcn/ui** component library. Auto-generated, do not edit manually. Key files:

| File | What it does |
|------|-------------|
| `button.tsx` | Button component with variants (default, outline, ghost, destructive). |
| `dialog.tsx` | Modal dialog wrapper. |
| `select.tsx` | Dropdown select. |
| `table.tsx` | Data table primitives. |
| `card.tsx` | Card container. |
| `badge.tsx` | Small status/label chip. |
| `sidebar.tsx` | shadcn sidebar primitives (base for AppLayout). |
| `chart.tsx` | Recharts wrapper components for bar/line/pie charts. |
| `CommandPalette.tsx` | `Cmd+K` global command palette. Search products, navigate pages. |
| `EmptyState.tsx` | Reusable "nothing here yet" illustration + message. |
| `sonner.tsx` | Toast notification provider. |
| *(all others)* | Standard shadcn/ui primitives (input, label, checkbox, switch, tabs, etc.) |

#### Root components
| File | What it does |
|------|-------------|
| `NavLink.tsx` | Sidebar nav item with active state highlight and icon. |
| `CustomerImporter.tsx` | CSV import tool for bulk-uploading customers. |
| `ProductImporter.tsx` | CSV import tool for bulk-uploading products with categories. |
| `RandomSeeder.tsx` | Dev tool — seeds random bills/products/customers for testing. Hidden in production. |

---

## `supabase/`

| Path | What it does |
|------|-------------|
| `config.toml` | Supabase CLI local dev config (project ref, ports). |
| `seed_sample_data.sql` | Sample data for local dev — businesses, products, bills. |
| `migrations/` | Ordered SQL migration files. Each file adds or alters a DB feature. Applied top-to-bottom in filename order. |

### Key Migrations
| File | What it added |
|------|--------------|
| `202602260100_master_bundle_v1.sql` | Core tables: businesses, products, bills, bill_items, customers, expenses, staff. |
| `202602260300_rename_admin_to_owner.sql` | Renamed `admin` role to `owner`. |
| `202602260500_advanced_features_v2.sql` | Recurring expenses, activity logs, split payment fields, due balance. |
| `202603040214_invoice_grid_settings.sql` | Invoice layout grid settings in business_settings. |
| `202603040230_qr_print_settings.sql` | UPI QR code toggle for print settings. |
| `202603150300_print_settings.sql` | Full print_settings JSONB column in business_settings. |
| `202603180000_add_urban_bill_colors.sql` | Urban bill template color customization. |
| `202604090001_customer_store_address.sql` | Customer store/billing address fields. |
| `202604100001_print_content_padding.sql` | Print content padding controls. |

---

## `android/`

Capacitor-generated Android project. **Do not edit manually** (except `strings.xml`, `build.gradle` for app config).

| Path | What it does |
|------|-------------|
| `app/build.gradle` | Android app build config. App ID: `com.invoiceadda.app`. Min SDK 22. |
| `app/src/main/assets/public/` | Vite `dist/` web assets synced here by `npx cap sync android`. |
| `app/src/main/res/values/strings.xml` | App name string: `Invoice Adda`. |
| `local.properties` | Android SDK path (machine-specific, gitignored). |

---

## `release/`

Electron build output. **Gitignored / not committed.**

| File | What it is |
|------|-----------|
| `Invoice Adda Setup 0.0.0.exe` | Windows NSIS installer. Installs the desktop app. |
| `win-unpacked/` | Unpacked app folder — can run without installing. |
| `latest.yml` | Auto-updater manifest for Electron's `autoUpdater`. |

---

## `public/`

Static files served as-is by Vite.

| File | What it is |
|------|-----------|
| `robots.txt` | Tells crawlers not to index (standard for SaaS apps). |

---

## `src/test/`

Vitest test files. Unit tests for hooks and utility functions.

---

## Build Commands (Quick Reference)

| Goal | Command |
|------|---------|
| Run dev server | `npm run dev` |
| Build web app | `npm run build` |
| Sync to Android | `npx cap sync android` |
| Build Android APK | `cd android && gradlew assembleDebug` |
| Build Windows EXE | `npx electron-builder --win --x64` |
| Run tests | `npm test` |
