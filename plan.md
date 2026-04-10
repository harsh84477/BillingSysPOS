# Invoice Adda — Complete Feature Plan

> A full-featured Billing & Point-of-Sale (POS) software for Indian businesses.
> Built with React, TypeScript, Tailwind CSS, Vite, Supabase (cloud database), Capacitor (Android), and Electron (Windows).

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui components |
| Database | Supabase (PostgreSQL, real-time, auth) |
| Desktop | Electron (Windows .exe installer) |
| Mobile | Capacitor (Android APK) |
| State | React Query (TanStack) + React Context |
| Routing | React Router v6 |

---

## 👤 Authentication & Roles

- Email + password login via Supabase Auth
- Email verification on signup
- **Three roles:**
  - `admin` — full access (settings, staff, reports, billing)
  - `staff` — billing + products only
  - `viewer` — read-only access
- **Super Admin** — platform-level login to manage all businesses
- Protected routes — role-based access control
- Session persistence across page reloads

---

## 🏢 Business Setup

- Business name, address, city, state, pincode
- Phone number, email, website
- GST registration number (GSTIN)
- Business logo upload
- Bank details (bank name, account number, IFSC)
- UPI ID + QR code for payments
- Currency symbol and format settings
- Invoice title customization (INVOICE / ESTIMATE / TAX INVOICE etc.)

---

## 🎨 App Theme Engine

- **7 Light themes:** Mint Pro, Sunset Orange, Royal Purple, Ocean Blue, Rose Gold, Slate Modern, Forest Deep
- **3 Dark themes:** Dark Pro, Cyber Neon, Midnight Blue
- Themes stored in database and synced across devices/sessions
- HSL-based CSS variable system — all UI respects the active theme
- Sidebar, cards, inputs, buttons all adapt automatically

---

## 📦 Product & Inventory Management

- Add / edit / delete products
- Product fields: name, SKU/code, HSN/SAC code, category, selling price, MRP, cost price, GST rate, unit (kg/piece/box etc.)
- Stock quantity tracking with low-stock threshold alerts
- Product image support
- Bulk import via CSV
- Random product seeder (for testing)

---

## 🗂️ Category Management

- Create categories with custom name, icon (emoji), and color
- Edit and delete categories
- Assign categories to products
- Category filter in POS billing screen

---

## 👥 Customer Management

- Add / edit customers: name, phone, email, address, GSTIN
- Customer import via CSV
- View complete purchase history per customer
- Outstanding balance / due amount tracking
- Quick customer search during billing

---

## 🧾 POS Billing Screen (Core Feature)

### Three-Panel Layout
| Left: Category + Filters | Center: Product Grid | Right: Cart / Bill |
|---|---|---|
| Category chips | Product cards with image | Items list |
| Price range slider | Search by name/SKU | Quantity +/- controls |
| Stock filter | Add to cart on click | Discount per item |
| | | Live totals |

### Billing Features
- Add items with + / − quantity controls
- Per-item discount (flat or %)
- Bill-level discount
- Auto GST calculation (CGST + SGST or IGST based on state)
- Customer selection or walk-in
- Salesman / staff attribution
- Save as **draft** or **complete** bill
- Auto-generated bill numbers (INV-YYYY-XXXX)
- Bill notes / remarks
- Received amount + balance due calculation
- Compact / Regular / Spacious display density modes
- Cart collapse/expand panel

---

## 📄 Invoice Printing

### Regular Printer (A4/A5/Letter/Legal)
- **6 layout themes:** Urban Bill Style, GST Theme 6, Classic Lite, Modern Dark, Double Divine, French Elite
- Company info: name, logo, address, phone, email, GSTIN
- Repeat header on all pages option
- Paper size and orientation choice
- Company name size + invoice text size
- Extra space top / content margin controls
- **Print Copies:** Original, Duplicate, Triplicate (with labels)
- Item table: Sr.No, HSN/SAC, Qty, MRP, Price, Disc%, GST, Amount columns (all toggleable)
- Min rows padding in table
- Totals section: GST summary, subtotal, discount, total tax, grand total
- Amount in words (Indian / International format)
- Bank details section with UPI QR code + PAY NOW button
- Footer / terms & conditions text
- Signature field
- Delivery/Received by fields, Payment mode
- Print acknowledgement copy

### Thermal Printer (58mm / 76mm / 80mm rolls)
- **5 receipt themes**
- Company name, logo, address, phone, email toggles
- Paper roll width selection (2 inch / 3 inch / 4 inch / custom)
- Printing type: Text (fast) / Graphic (rich) / ESC/POS
- Bold styling toggle
- Auto-cut paper
- Open cash drawer
- Extra blank lines at end
- Number of copies
- Footer / thank-you text

### Live Print Preview
- Real-time A4 paper preview (scales to available space)
- Shows "ORIGINAL FOR RECIPIENT" label when duplicate enabled
- Thermal receipt preview with correct roll width

---

## 📋 Bills History

- List all completed bills with search + filter
- Filter by date range, customer, salesman, amount
- View full bill details
- Reprint / download PDF
- Mark bills as paid/unpaid
- Delete bills (admin only)

---

## 📝 Draft Bills

- Save incomplete bills and resume later
- Shows all draft bills with customer + amount info
- Convert draft to final bill

---

## ⏰ Due Bills

- Bills with outstanding balances
- Track payment due dates
- Record partial payments
- Due amount summary

---

## 💰 Expenses Management

- Add / edit / delete expenses
- Categories: Rent, Salaries, Utilities, Supplies, etc.
- Date, amount, description, payment method
- Expense reports and totals

---

## 📊 Reports

- **Sales Report:** Daily / weekly / monthly / custom range
- **Product Report:** Top selling products, sales by category
- **Customer Report:** Top customers, purchase frequency
- **Expense Report:** Expense breakdown by category
- **Profit & Loss:** Revenue vs expenses
- Export reports (planned)

---

## 👨‍💼 Staff Management (Admin only)

- Invite staff via email
- Assign roles (staff / viewer)
- View staff activity
- Remove staff access

---

## 🖥️ POS Settings

- POS layout configuration
- Quick-access product grid settings
- Shortcut keys
- Display density preference

---

## 🔧 Settings Tabs

| Tab | What it controls |
|-----|-----------------|
| Business | Company info, logo, bank details, UPI |
| Billing | Tax settings, bill numbering, discount rules |
| Categories | Product categories manager |
| Staff | Team access & roles |
| Print Config | Invoice/receipt design & printer settings |
| POS | POS screen layout & behaviour |
| App Theme | Visual theme selection (light/dark) |

---

## 📱 Multi-Platform

| Platform | Output | How to build |
|----------|--------|-------------|
| Web | Hosted via Vercel | `npm run build` |
| Windows | `release/Invoice Adda Setup 0.0.0.exe` | `npm run build:win` |
| Android | `android/app/build/outputs/apk/debug/app-debug.apk` | `npm run build:android` then `cd android && gradlew assembleDebug` |

---

## 🗄️ Database (Supabase)

Key tables:
- `business_settings` — all business config + print settings + theme
- `bills` — completed billing records
- `bill_items` — line items per bill
- `products` — product catalog
- `categories` — product categories
- `customers` — customer directory
- `expenses` — expense records
- `staff` — user-to-business role assignments
- `activity_logs` — audit trail of actions

---

## 🔒 Security

- Row Level Security (RLS) on all Supabase tables
- Role-based UI guards (admin-only features hidden from staff/viewer)
- Supabase Auth handles JWT tokens
- No plaintext credentials in frontend code
