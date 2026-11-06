<<<<<<< HEAD
# 🍣 SUSHI HOTEL – Smart POS & Digital Bill Book
> **Location:** Padalur – Oottathur Road  
> **Production-grade Restaurant POS System** for Laptop, Tablet, Mobile Phone, and Android APK.

---

## ⚡ Quick Start: Running Frontend & Backend

In this Next.js 16+ full-stack architecture, **both Frontend and Backend API/Server run simultaneously using a single command**.

### 1. Install Dependencies (First time only)
```bash
npm install --legacy-peer-deps
```

### 2. Run Locally in Development Mode
```bash
npm run dev
```
> App will be accessible at:  
> 🌐 **Local:** [http://localhost:3000](http://localhost:3000)  
> 📱 **Network / Mobile:** `http://<your-laptop-ip>:3000` (e.g. `http://192.168.1.5:3000`)

---

## 🗄️ Backend & Database Setup (Supabase PostgreSQL)

The system uses **Supabase PostgreSQL** for the cloud database backend, with full offline resilience.

### Step 1: Create a Free Project on Supabase
1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. In the **SQL Editor**, open [`supabase_schema.sql`](file:///c:/Users/Hp/Documents/billbook/supabase_schema.sql) from this project and click **RUN**.
   - This creates all tables: `categories`, `products`, `bills`, `bill_items`, `settings`, `printer_settings`.
   - Sets up Row Level Security (RLS) policies and performance indexes.

### Step 2: Configure Environment Variables
Copy [.env.example](file:///c:/Users/Hp/Documents/billbook/.env.example) to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

*Note: Even without internet or before adding Supabase keys, the POS runs 100% offline using its built-in local store with automatic sync queues!*

---

## 🚀 Production Build & Run

To test or deploy in high-performance production mode:

```bash
# 1. Build optimized bundle
npm run build

# 2. Start production server
npm run start
```

---

## 📱 Android APK Build (Capacitor)

The project includes pre-configured Capacitor integration (`com.sushihotel.pos`).

```bash
# 1. Build the production web bundle
npm run build

# 2. Add Android platform (first time only)
npx cap add android

# 3. Sync web assets to Android project
npx cap sync android

# 4. Open in Android Studio to build APK
npx cap open android
```
In Android Studio:
- Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
- Transfer `app-debug.apk` to any Android phone or tablet.

---

## 🖨️ Thermal Receipt Printing Setup

1. **Browser Direct Print**: Works out of the box with standard `window.print()` targeting formatted 80mm or 58mm thermal receipts.
2. **Wi-Fi / LAN Network Printer**:
   - Go to **Settings** → **Thermal Receipt Printer Configuration**.
   - Select **Wi-Fi / LAN Network Thermal Printer (ESC/POS)**.
   - Enter your printer's IP (e.g. `192.168.1.100`) and Port `9100`.
   - Click **Test Print Receipt**.
3. **USB / Bluetooth Printer**:
   - Connect via local print bridge service at `http://localhost:9100/print`.

---

## 👥 Default Login Credentials
- **URL:** [http://localhost:3000/login](http://localhost:3000/login)
- **Username / Email:** `admin@sushihotel.com` (or `counter`)
- **Password:** `sushihotel2026` (or `1234`)
- Or switch to **Initial Setup** tab to create your custom admin credentials.
=======
# bill-booking-system
>>>>>>> f2a5343824f49d08188b1c412142162abffd3983
# Bill-booking-system
