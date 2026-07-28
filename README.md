# 🏛️ LNMIIT Smart Resource Booking Portal

An enterprise-grade campus resource management and automated booking platform built for LNMIIT Jaipur. Enables students, faculty, and administrators to reserve Auditoriums, Lecture Halls, Photography Equipment (Sony DSLRs, Tripods), Discussion Rooms, and SAC Sports Facilities seamlessly.

---

## 🌐 Live Production Deployments

- 🚀 **Live Web Application (Vercel)**: [https://gdg-clg-proj-1.vercel.app](https://gdg-clg-proj-1.vercel.app)
- ⚡ **Backend REST API & OpenAPI Docs (Render)**: [https://lnmiit-booking-backend-430o.onrender.com/docs](https://lnmiit-booking-backend-430o.onrender.com/docs)
- ⏱️ **Automated Production Cron Status**: `Active 🟢` (APScheduler & Keep-Alive Ping)

---

## ✨ Features & Highlights

- 🔐 **LNMIIT Domain OTP Authentication**: Passwordless login restricted strictly to `@lnmiit.ac.in` domain emails.
- 🎨 **Dynamic Dark & Light Theme**: Curated high-contrast LNMIIT branding (Maroon `#7A0F17` & Gold `#D4AF37`) with smooth local persistence.
- 📊 **Real-time Availability Timeline**: Read-only timeline grid preventing double-booking conflicts via SQLAlchemy row locks.
- 📅 **Categorized Booking Management**:
  - **Ongoing 🟢**: Events taking place right now (`start_time <= now <= end_time`).
  - **Upcoming 📅**: Scheduled future reservations (`start_time > now`).
  - **History 📜**: Completed and past event archives (`end_time < now`).
- ⚡ **Auto-Draft Continuation**: Pre-fills category, resource, date, and 12-hour AM/PM start time directly from the homepage into the booking form.
- 🛡️ **Role-Based Admin Panel**: Admin controls to approve/reject bookings, manage resources, and oversee campus metrics.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, React Router v6, Axios, Vanilla CSS with CSS Custom Tokens
- **Backend**: FastAPI (Python 3.11), Pydantic v2, SQLAlchemy 2.0 Async
- **Database**: PostgreSQL (Production) / SQLite Async (Development)
- **Deployment**: Vercel (Frontend SPA) + Render / Railway (Backend Web Service + Managed Postgres)
- **Background Scheduler**: APScheduler + Cron-Job Keep Alive

---

## 🚀 One-Click Production Deployment

### 1. Backend + Database on Render (Render Blueprint)
1. Push this repository to your GitHub account.
2. Sign in to [Render.com](https://render.com).
3. Click **New +** ➔ **Blueprint**.
4. Connect this repository — Render will automatically detect [`render.yaml`](file:///c:/CSE_BABY/Gdg_clg_proj_1/render.yaml) and provision:
   - Managed **PostgreSQL Database** (`lnmiit-booking-db`)
   - FastAPI **Web Service** (`lnmiit-booking-backend`)
5. Click **Apply**. Once deployed, copy your web service live API URL (`https://<your-backend>.onrender.com`).

### 2. Frontend on Vercel
1. Sign in to [Vercel.com](https://vercel.com).
2. Click **Add New...** ➔ **Project** and import your repository.
3. Set **Framework Preset**: `Vite`
4. Set **Root Directory**: `frontend`
5. Add Environment Variable:
   - `VITE_API_URL` = `https://<your-backend>.onrender.com`
6. Click **Deploy**. Vercel will build and launch your frontend application!

### 3. Production Cron Job Setup
To ensure Render's free tier remains awake and runs automatic booking completion cleanup:
1. Log into [cron-job.org](https://cron-job.org).
2. Add a new job hitting `https://<your-backend>.onrender.com/api/bookings/me` every 10 minutes (`*/10 * * * *`).

---

## 💻 Local Development Setup

### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit local app: `http://localhost:5173`  
Backend API Docs: `http://localhost:8000/docs`

---

## 📄 License
Distributed under the MIT License. Built for LNMIIT Campus Community.
