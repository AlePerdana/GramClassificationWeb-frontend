# GramClassificationWeb Frontend

Frontend aplikasi klasifikasi gram berbasis React + Vite + Tailwind CSS.

## 1) Setup Environment

### Prasyarat
- Node.js 20.x atau lebih baru (disarankan LTS)
- npm 10.x atau lebih baru
- Git

### Install & jalankan (development)
1. Buka terminal di root project.
2. Install dependency:
	 - `npm install`
3. Jalankan development server:
	 - `npm run dev`
4. Buka URL yang muncul di terminal (umumnya `http://localhost:5173`).

### Build production
- `npm run build`

Output build akan berada di folder `dist/`.

### Preview build production secara lokal
- `npm run preview`

### Linting
- `npm run lint`

### Catatan environment variable
Saat ini project tidak mewajibkan file `.env` untuk berjalan. Jika nanti ditambahkan variabel Vite, gunakan format `VITE_NAMA_VARIABEL=nilai` pada `.env.local`.

---

## 2) Penjelasan Role

Routing role ada di `src/App.jsx` dan menu role ada di `src/components/layout/Sidebar.jsx`.

### Admin (`/admin`)
Fokus pada konfigurasi dan manajemen sistem:
- Beranda admin
- Konfigurasi AI model
- Data pasien
- Manajemen pengguna

### Dokter (`/doctor`)
Fokus pada validasi hasil:
- Beranda dokter
- Daftar validasi
- Detail validasi per kasus
- Riwayat validasi

### Analis (`/analyst`)
Fokus pada proses analisis laboratorium:
- Beranda analis
- Daftar pasien
- Proses klasifikasi per pasien
- Riwayat proses analisis

---

## 3) Penjelasan Struktur Folder Workspace

### Root
- `public/`  
	Aset statis publik (disajikan langsung tanpa diproses bundler).

- `src/`  
	Kode utama aplikasi React.

- `eslint.config.js`  
	Konfigurasi aturan ESLint.

- `index.html`  
	Template HTML utama untuk Vite.

- `package.json`  
	Metadata project, script npm, dependency, dan devDependency.

- `postcss.config.js`  
	Konfigurasi PostCSS (dipakai oleh Tailwind/autoprefixer).

- `tailwind.config.js`  
	Konfigurasi Tailwind CSS.

- `vite.config.js`  
	Konfigurasi Vite.

- `README.md`  
	Dokumentasi project.

### `src/`
- `src/main.jsx`  
	Entry point React (mount aplikasi ke DOM).

- `src/App.jsx`  
	Konfigurasi routing utama aplikasi berdasarkan role.

- `src/index.css`  
	Styles global + integrasi Tailwind.

- `src/assets/`  
	Aset lokal untuk aplikasi (gambar, ikon, dsb).

- `src/components/`  
	Komponen reusable UI.

	- `src/components/layout/Sidebar.jsx`  
		Sidebar dinamis berdasarkan role (`admin`, `dokter`, `analis`).

- `src/layouts/`  
	Layout tingkat halaman.

	- `src/layouts/MainLayout.jsx`  
		Layout utama halaman setelah login (sidebar + konten dengan `Outlet`).

- `src/pages/`  
	Halaman-halaman aplikasi berdasarkan domain/role.

	- `src/pages/auth/`  
		Halaman autentikasi.
		- `Login.jsx`

	- `src/pages/admin/`  
		Halaman role admin.
		- `Dashboard.jsx`
		- `ModelManagement.jsx`
		- `PatientManagement.jsx`
		- `UserManagement.jsx`

	- `src/pages/analyst/`  
		Halaman role analis.
		- `Dashboard.jsx`
		- `PatientList.jsx`
		- `AnalysisProcess.jsx`
		- `History.jsx`
		- `notoffsetfordrawingbox.jsx` (file eksperimen/utilitas; tidak dipakai route utama)

	- `src/pages/doctor/`  
		Halaman role dokter.
		- `Dashboard.jsx`
		- `ValidationList.jsx`
		- `ValidationDetail.jsx` (dipakai route utama)
		- `History.jsx`
		- `ValidationDetail copy.jsx` (salinan/arsip)
		- `ValidationDetail copy 2.jsx` (salinan/arsip)

---

## 4) Scripts yang tersedia

- `npm run dev` → jalankan app mode development
- `npm run build` → build app production
- `npm run preview` → preview hasil build
- `npm run lint` → cek kualitas kode dengan ESLint
