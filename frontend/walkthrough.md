# Walkthrough - RBAC Apps Dashboard & Routing

We have successfully implemented the Role-Based Access Control (RBAC) authorization layer, routing logic, and created the dynamic, fully interactive Apps workspace at `/apps`.

---

## What We Accomplished

### 1. Unified Authentication with RBAC
- **Dynamic Role Mapping**: Modified [LoginModal.tsx](file:///Users/iyamif/Documents/GitHub/gim-swimming/frontend/components/LoginModal.tsx) to automatically detect and map roles from Username/Email inputs:
  - Usernames containing `admin` are mapped to the **Admin** role.
  - Usernames containing `pelatih` or `coach` are mapped to the **Pelatih** (Coach) role.
  - All other usernames are mapped to the **Orang Tua** (Parent) role.
- **Demo Quick Picker Panel**: Added an interactive panel at the bottom of the login modal featuring one-click buttons to pre-fill credentials for all three roles:
  - **Admin**: `admin@gimswimming.com`
  - **Pelatih**: `pelatih@gimswimming.com`
  - **Orang Tua**: `ortu@gimswimming.com`
- **Session Persistence**: Configured [Navbar.tsx](file:///Users/iyamif/Documents/GitHub/gim-swimming/frontend/components/Navbar.tsx) to store `gim_swimming_role` and `gim_swimming_user` in `localStorage` upon success, clearing them upon logout.

### 2. Page Routing & Shortcut Access
- Integrated Next.js `useRouter` to push users automatically to `/apps` after verification.
- Added a permanent **Buka Apps** (Open Apps) button next to the greeting in the desktop navbar and mobile hamburger drawer. If a user is already logged in, they can jump straight to the dashboard with one click.

### 3. Fully Interactive RBAC Apps Workspace: [page.tsx](file:///Users/iyamif/Documents/GitHub/gim-swimming/frontend/app/apps/page.tsx)
Built a dashboard matching modern SaaS aesthetics, featuring:
- **Authentication Guard**: Verifies role credentials on mount. Unauthorized direct navigation to `/apps` redirects the user back to the homepage.
- **Role-Based Side Navigation**: Automatically filters links based on active role permissions.
- **Shared In-Memory Database Simulation**: Allows actions taken on one tab to dynamically update another:
  1. **Dashboard Tab (All Roles)**: Shows custom stats (e.g. Admin sees monthly revenue, Pelatih sees assigned students, Orang Tua sees child metrics and ratings).
  2. **Keuangan Tab (Admin & Orang Tua)**:
     - **Orang Tua**: Displays current bills (SPP Rp 500,000) and an interactive **Upload Bukti Transfer** button (simulates file uploads, changing invoice status to *Menunggu Konfirmasi*).
     - **Admin**: Displays a list of transfers awaiting confirmation with **Konfirmasi** and **Tolak** buttons. Confirming updates the invoice to *Lunas* in-memory.
  3. **Daftar Hadir Siswa Tab (All Roles)**:
     - **Admin/Pelatih**: Lists all registered students and their overall attendance rate. Clicking a student reveals their historical calendar overlay.
     - **Orang Tua**: Shows their child's attendance log (Present, Permitted, Sick, Absent).
  4. **Absensi Tab (Admin & Pelatih)**: Allows recording daily attendance. Selecting a class category (e.g. *Beginner*) and clicking **Simpan Absensi** updates the students' logs and recalculates their attendance percentages.
  5. **Create Pelatih/Siswa Tab (Admin Only)**: Features addition forms for students and coaches. Submitting actually appends them to the in-memory lists, updating stats and student rosters dynamically.

---

## How to Verify Manually

1. **Start the Next.js Server:**
   ```bash
   npm run dev
   ```
2. **Access the Modal:**
   Click **Masuk** in the header or hamburger menu.
3. **Log In as Admin:**
   - Click the **Admin** button in the Demo Quick Picker to pre-fill, then click **Masuk ke Akun**.
   - Verify that the app routes to `/apps` and the sidebar lists all 5 tabs.
   - Go to **Create Pelatih/Siswa** and add a student named `Tono` assigned to `Beginner Class`.
   - Go to **Daftar Hadir Siswa** and verify that `Tono` is listed.
4. **Log In as Pelatih (Coach):**
   - Log out, open the modal, click **Pelatih** in the Quick Picker, and log in.
   - Verify that you only have access to 3 tabs (Dashboard, Daftar Hadir Siswa, Absensi).
   - Go to **Absensi**, select `Beginner` class, mark student `Tono` as **Hadir**, and click **Simpan Absensi**.
   - Go to **Daftar Hadir Siswa**, click `Tono`, and verify the log now records today's attendance.
5. **Log In as Orang Tua (Parent):**
   - Log out, open the modal, click **Orang Tua** in the Quick Picker, and log in.
   - Verify you only have access to 3 tabs (Dashboard, Laporan Keuangan, Daftar Hadir Siswa).
   - Go to **Laporan Keuangan**, click **Unggah & Kirim Bukti Transfer SPP**, and verify the status shifts to *Menunggu Konfirmasi*.
   - Log back in as **Admin** and click **Konfirmasi** on Rian's invoice. Verify the status updates to *Lunas*.
