# Sugarcane Nursery Inventory & Order Management App

A full-stack solution for managing sugarcane nursery orders, inventory, and production using **React (Vite + Tailwind)** and **Google Sheets (via Apps Script)**.

---

## 🚀 Google Spreadsheet Integration Guide

### Step 1: Create the Spreadsheet
1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.
2. Create **three tabs** named exactly: `Orders`, `StockLedger`, and `CurrentStock`.
3. Add the following headers in **Row 1** for each tab:

**Tab 1: `Orders`**
```text
id | name | acre | rate | trays_required | seedlings_required | delivery_date | status | created_at | reserved_ready_tray | reserved_seedlings | reserved_tray | reserved_cocopeat
```

**Tab 2: `StockLedger`**
```text
id | item | change | type | reference_id | note | date
```

**Tab 3: `CurrentStock`**
```text
item | available | reserved
```

4. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`YOUR_SHEET_ID_HERE`**`/edit`

---

### Step 2: Deploy Google Apps Script
1. In your Google Sheet, go to **Extensions** > **Apps Script**.
2. Delete any existing code and paste the contents of `gas/Code.gs` from this project.
3. Click on **Project Settings** (gear icon) > **Script Properties** > **Add script property**.
   - Property: `SHEET_ID`
   - Value: *(Your Spreadsheet ID from Step 1)*
4. Click **Deploy** > **New Deployment**.
   - Select type: **Web app**
   - Description: `Sugarcane Nursery API`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, authorize permissions, and copy the **Web App URL**.

---

### Step 3: Connect the React App
1. Open the `.env` file in the root of this project.
2. Update the `VITE_GAS_URL` with your Web App URL:
   ```env
   VITE_GAS_URL=https://script.google.com/macros/s/.../exec
   ```
3. Restart your development server:
   ```bash
   npm run dev
   ```

---

## 🛠 Features
- **Ledger-Based Inventory**: Every change is tracked as a transaction for 100% accuracy.
- **Order Lifecycle**: Seamless flow from `PENDING` → `CONFIRMED` → `PREPARED` → `DELIVERED`.
- **Auto-Calculations**: Automatic conversion of Acres to Trays and Seedlings.
- **Stock Management**: Real-time ready tray vs. raw material tracking with low-stock alerts.
- **Atomic Operations**: Prevents race conditions and stock drift using Google's `LockService`.

## 📦 Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Zustand, Lucide Icons.
- **Backend**: Google Sheets API (Apps Script).
- **Styling**: Modern, Clean, Mobile-first Responsive Design.

---

## 🏃‍♂️ Getting Started (Dev)
```bash
# Install dependencies
npm install

# Run the app
npm run dev
```
Proxying via Apps Script allows this app to communicate directly with your Google Sheet without complex OAuth setups, making it perfect for private/internal nursery management.
