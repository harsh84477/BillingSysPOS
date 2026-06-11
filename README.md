# 🧾 Invoice Adda

A premium, full-featured Point of Sale (POS) and Business Management System designed for small and medium businesses. Invoice Adda is a multi-platform solution running seamlessly on the **Web, Android (Mobile), and Windows (Desktop)** from a single, modern codebase.

---

## 📥 Download App & Desktop Software

To showcase the application, pre-compiled binaries are provided directly in the repository. Click the badges below or download them from the file table.

### Direct Downloads

[![Download Android APK](https://img.shields.io/badge/Download-Android%20APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](./android-apk/InvoiceAdda.apk)
&nbsp;&nbsp;&nbsp;&nbsp;
[![Download Windows Setup](https://img.shields.io/badge/Download-Windows%20Setup-0078D6?style=for-the-badge&logo=windows&logoColor=white)](./windows-installer/InvoiceAddaSetup.exe)

| Platform | Recommended For | Release File | Direct Download Link | File Size |
| :--- | :--- | :--- | :--- | :--- |
| 🤖 **Android Mobile** | Field Salesmen / Mobile users | `android-apk/InvoiceAdda.apk` | [**Download APK**](./android-apk/InvoiceAdda.apk) | `~8.2 MB` |
| 💻 **Windows Computer** | Store counter / Backoffice PC | `windows-installer/InvoiceAddaSetup.exe` | [**Download Setup Installer**](./windows-installer/InvoiceAddaSetup.exe) | `~130.1 MB` |

---

## 🌟 About Invoice Adda

Invoice Adda is a robust Point of Sale (POS) and inventory system tailor-made for Indian retail, wholesale, and distribution businesses. From quick barcode-free billing and customer credit management to offline synchronization and automated GST reporting, Invoice Adda handles the day-to-day operations of modern enterprises.

### Why Choose Invoice Adda?

- **Real-Time Synergy**: Business owners can track live sales from a central dashboard while field salesmen take orders on their mobile phones out in the field.
- **Offline Resilience**: Network drops don't interrupt your business. Create bills offline and let the app auto-synchronize to the cloud when internet connection is restored.
- **GST Compliance Made Easy**: Built-in tax engines auto-calculate CGST+SGST/IGST per item or bill and generate formatted GSTR-1 & GSTR-3B spreadsheets in one click.
- **Customizable Experience**: Supports 10 premium interface themes, flexible user permission levels, and exhaustive print adjustments for A4, A5, and 58mm thermal receipts.

---

## 🚀 Key Features

### 1. Interactive Billing Dashboard
- **Live Performance KPIs**: Monitor today's/monthly revenue, bills generated, and net profit margins.
- **Low Stock Notifications**: Prevent stockouts with automated reorder threshold triggers.
- **Field Sales Monitoring**: Review salesman order counts, revenue, and active progress against targets.

### 2. Advanced POS & Cart Controls
- **Flexible POS Grid**: Clean 3-panel UI with category filtering, product search, and instant single-tap addition.
- **GST Tax Engine**: Dynamic CGST + SGST or IGST tax computation at the line item or invoice level.
- **Split & Credit Payments**: Accept combined payments (Cash + UPI + Card) or record client outstanding dues.
- **Customer Dues & Credit Limits**: Prevent bad debt with custom credit limits and warning thresholds.
- **Loyalty Program**: Award loyalty points based on configurable bill percentages and allow quick redemption.

### 3. Field Salesman System
- **Mobile-Optimized Billing**: Large buttons and swipe gestures designed for on-the-go salesmen.
- **Assigned Stores Registry**: Salesmen see only assigned retail stores, location details, area codes, and history.
- **Monthly Targets**: Keep track of sales targets (order count and revenue amounts) with visual progress bars.
- **Owner Approval Dashboard**: Salesman orders save as pending drafts until verified and finalized by the owner or manager.

### 4. Products & Categories Management
- **4 Pricing Tiers**: Setup MRP, Selling Price, Cost Price, and Wholesale Price for every product.
- **Inventory Logs**: Audit trail for all manual adjustments, purchase orders, or sales deductions.
- **Bulk Import**: Quickly upload your entire product catalog or customer base using structured CSV templates.

### 5. Expense Tracking & Financials
- **Dynamic Cashflow Ledger**: Track daily expenses categorized by utilities, rent, wages, transport, etc.
- **Recurring Schedules**: Auto-create recurring monthly business expenses.
- **P&L Reporting**: Expenses are automatically subtracted from sales profit to give an accurate net profit breakdown.

### 6. Reports & Analytics
- **Visual Analytics**: Interactive charts for revenue trends, monthly profit, and top product categories.
- **GST Filing Reports**: One-click GSTR-1 and GSTR-3B spreadsheet generation formatted for immediate portal filing.
- **Multi-Format Export**: Export bills, reports, inventory lists, and salesmen orders to PDF, styled Excel, or CSV.

### 7. Multi-Role Access Control (RBAC)
- **Super Admin**: SaaS management, registration logs, plans pricing, and business subscription control.
- **Owner**: Full system access, staff control, billing configuration, print templates, and settings.
- **Manager**: View reports, manage inventory, customer databases, and approve salesman orders.
- **Cashier**: Standard POS billing, receipt printing, drafts, and customer directory lookup.
- **Salesman**: Mobile-optimized field billing, assigned store database, order history, and personal targets.

### 8. Offline Sync Engine
- **Local Cache**: Products, customers, and categories are cached locally using IndexedDB for zero latency.
- **Queue & Sync**: If the internet disconnects, operations are queued locally and automatically sync back to Supabase once connection is recovered.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite | Core user interface framework and lightning-fast bundler. |
| **Styling** | Tailwind CSS, shadcn/ui, Radix UI | Premium responsive layouts, accessible interactive primitives, and animations. |
| **Database & Auth** | Supabase (PostgreSQL) | Secure backend data store, staff accounts auth, and Row Level Security. |
| **Offline Sync** | IndexedDB (`idb`), React Query | Offline transactions queue caching, synchronization, and query management. |
| **Document Export**| jsPDF, sheetjs (`xlsx`) | Styled multi-sheet Excel workbooks and professional PDF formatting. |
| **Wrappers** | Electron, Capacitor | Desktop integration wrapper for Windows and mobile app wrapper for Android. |

---

## 💻 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**:
   ```sh
   git clone https://github.com/your-username/invoice-adda.git
   ```

2. **Install dependencies**:
   ```sh
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
   ```

4. **Start the Development Server**:
   ```sh
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.

### Build and Package Commands

- **Build Production Bundle**:
  ```sh
  npm run build
  ```
- **Build & Package Windows Desktop App**:
  ```sh
  npm run build:win
  ```
  The packaged installer will be generated in the `release/` directory.

- **Sync Android Mobile Assets**:
  ```sh
  npm run build:android
  ```
  This builds the frontend bundle and copies assets into the Capacitor Android project.
