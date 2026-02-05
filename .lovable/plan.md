

# Universal Smart Billing & POS Software

## Overview
A fully customizable, theme-based billing system that works for any business type. Built with React, TypeScript, Tailwind CSS, and Supabase for a modern, touch-friendly experience on both tablets and desktops.

---

## Phase 1: Foundation & Authentication

### 🔐 Authentication System
- Email/password login with email verification
- Three user roles: **Admin**, **Staff**, **Viewer**
- Protected routes based on user roles
- Secure session management

### 🏢 Business Setup
- Business name, address, contact details
- Logo upload
- Currency configuration
- Tax rules setup (GST/VAT configurable)

---

## Phase 2: Theme Engine

### 🎨 Visual Customization
- 5 pre-built themes: Mint Pro, Sunset Orange, Royal Purple, Ocean Blue, Dark Pro
- Stored in database (syncs across devices)
- HSL-based color system for consistency
- Theme preview before applying

---

## Phase 3: Product & Category Management

### 📦 Products
- Add, edit, delete products with images
- Assign categories
- Set selling price, cost price
- Stock quantity tracking
- Low stock threshold alerts

### 🗂️ Categories
- Create categories with icons/colors
- Filter products by category in POS

---

## Phase 4: Customer Management

### 👥 Customer Records
- Add/edit customers with contact details
- View complete purchase history per customer
- Quick customer selection during billing

---

## Phase 5: The POS/Billing Screen (Core Feature)

### Three-Panel Layout
| Left Panel | Center Panel | Right Panel |
|------------|--------------|-------------|
| Category filters | Product grid | Current bill |
| Price range filters | Search bar | Quantity controls |
| | Quick add | Live totals |

### Billing Features
- Add/remove items with quantity adjustment
- Apply discounts (flat or percentage)
- Auto-calculate taxes based on settings
- Select or add customer
- Save as draft or complete bill
- Auto-generated bill numbers

### Bill Actions
- Generate PDF invoice
- Print receipt
- Save and continue later (draft mode)

---

## Phase 6: Inventory Management

### 📊 Stock Control
- Auto-deduct stock on bill completion
- Manual adjustment (admin only)
- Full inventory audit logs
- Low stock alerts on dashboard

---

## Phase 7: Dashboard & Analytics

### 📈 At-a-Glance Metrics
- Today's sales total
- Monthly revenue
- Pending/draft bills count
- Low stock product alerts

### Visual Reports
- Sales trend charts
- Top selling products
- Recent bill activity

---

## Phase 8: Settings Panel

### ⚙️ Configuration
- Business information editing
- Appearance/theme selection
- Billing rules (auto bill numbers, prefix)
- Tax configuration (rate, name, inclusive/exclusive)

---

## Phase 9: Offline Support

### 📴 Basic Offline Capability
- Cache products and prices locally
- Queue bills when offline
- Auto-sync when connection restores
- Visual offline/online indicator

---

## Technical Implementation

### Database Structure
- **business_settings**: Store configuration
- **categories**: Product categories
- **products**: Product catalog with stock
- **customers**: Customer records
- **bills**: Bill headers with totals
- **bill_items**: Individual line items
- **inventory_logs**: Stock change audit trail
- **user_roles**: Role-based access control

### Security
- Row Level Security on all tables
- Role-based access (admin vs staff vs viewer)
- Secure API calls through Supabase

---

## What You'll Get

✅ Complete POS system usable by any business type  
✅ Fully responsive (tablet + desktop)  
✅ Professional PDF invoices  
✅ 5 beautiful themes to match any brand  
✅ Real-time inventory tracking  
✅ Works offline with auto-sync  
✅ Role-based access for team management  

