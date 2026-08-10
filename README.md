# 🏛️ LNMIIT Smart Campus Resource Booking Portal (CampusDesk)

[![Live App](https://img.shields.io/badge/Live_App-Vercel-success?style=for-the-badge&logo=vercel)](https://gdg-clg-proj-1.vercel.app)
[![API Docs](https://img.shields.io/badge/API_Docs-FastAPI-blue?style=for-the-badge&logo=fastapi)](https://lnmiit-booking-backend-430o.onrender.com/docs)
[![Python](https://img.shields.io/badge/Backend-FastAPI_Python_3.11-darkgreen?style=for-the-badge&logo=python)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_Vite-navy?style=for-the-badge&logo=react)](https://react.dev)

A full-stack enterprise campus resource reservation engine built for **The LNM Institute of Information Technology (LNMIIT), Jaipur**. Enables students, faculty, and administrators to reserve Auditoriums, Lecture Halls, Photography & Media Gear (Sony DSLRs, Tripods, Mics), Discussion Rooms, and SAC Sports Grounds — featuring zero double-bookings, real-time availability timelines, and automated email reminders.

---

## 📹 Demo Video

- 🎥 **Walkthrough Video Link (YouTube)**: [https://www.youtube.com/watch?v=7YGtv29cGJ4](https://www.youtube.com/watch?v=7YGtv29cGJ4) *(1 min 40 sec walkthrough of application workflow, passwordless OTP sign-in, overlap conflict prevention, and admin command center)*


---

## 🌐 Live Production Deployments

- 🚀 **Live Web Application (Vercel)**: [https://gdg-clg-proj-1.vercel.app](https://gdg-clg-proj-1.vercel.app)
- ⚡ **Backend REST API & OpenAPI Docs (Render)**: [https://lnmiit-booking-backend-430o.onrender.com/docs](https://lnmiit-booking-backend-430o.onrender.com/docs)
- 🗄️ **Managed Database (Render PostgreSQL)**: Production PostgreSQL with Row-Level Locking (`with_for_update()`)
- ⏱️ **Automated Cron Jobs**: APScheduler running every 60s for email reminders & status completion

---

## 🔑 Key Features Implemented

1. **Authentication (Email OTP + JWT)**:
   - Passwordless sign-in with 6-digit email OTPs (valid for 5 minutes, single use).
   - Rate limited to max 3 OTP requests per email per 10 minutes (returns HTTP 429).
   - JWT tokens with 24-hour expiration containing user ID and role (`student` or `admin`).
   - Domain auto-fill support for `@lnmiit.ac.in`.

2. **Concurrency-Safe Conflict Prevention**:
   - Overlap formula: `startA < endB AND startB < endA`.
   - Back-to-back bookings (e.g. `10:00–11:00` and `11:00–12:00`) are explicitly allowed.
   - Pessimistic row locking (`with_for_update()`) in PostgreSQL guarantees zero double-booking races.
   - Returning HTTP 409 Conflict with clashing slot details on overlap.

3. **Automated Reminders & Background Maintenance**:
   - Background APScheduler job checks every minute.
   - Sends email reminders 1 hour before booking start (formatted cleanly in 12-hour AM/PM time).
   - Auto-marks past confirmed bookings as `completed`.

4. **MakeMyTrip-Style Production UI/UX**:
   - Full hero section with official LNMIIT LIC building backdrop.
   - Floating quick-reservation card with 4-column field grid.
   - Real-time 12-hour AM/PM availability timeline grid.
   - Live animated pulsing badges for ongoing bookings.
   - Dark/Light mode toggle with persisted local preferences.

5. **Admin Executive Control Panel**:
   - Dedicated dashboard for campus admins to oversee reservations, filter by date/status, cancel any booking, and add/edit campus resources.

---

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python 3.11), SQLAlchemy 2.0 Async, Pydantic v2, APScheduler
- **Database**: PostgreSQL (Production) / Async SQLite (Local Dev)
- **Frontend**: React 18, Vite, React Router v6, Axios, Vanilla CSS Custom Tokens
- **Email Service**: Brevo HTTP REST API (port 443) / Gmail SMTP
- **Deployment**: Vercel (Frontend) + Render (Backend & PostgreSQL)

---

## 💻 Local Setup & Execution Guide

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Clone the Repository
```bash
git clone https://github.com/RONAKJAIN122/Gdg_clg_proj_1.git
cd Gdg_clg_proj_1
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

#### Environment Variables (`backend/.env`)
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=sqlite+aiosqlite:///./test.db
SECRET_KEY=super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440
EMAIL_FROM=lnmiiitopt@gmail.com
BREVO_API_KEY=your_brevo_api_key_here
```

#### Run Backend Server & Auto-Seed
```bash
python -m uvicorn app.main:app --reload --port 8000
```
*Note: The server automatically seeds 1 Admin user (`admin@me.in`), student accounts, and 13 LNMIIT campus resources on initial startup!*

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

Visit local app: [http://localhost:5173](http://localhost:5173)  
Backend API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📄 Documentation

- 📘 [`DESIGN.md`](./DESIGN.md) — Comprehensive technical design document covering overlap math, concurrency protection, state persistence, and debugging case studies.

---

## 📜 License
Distributed under the MIT License. Built for LNMIIT GDG Recruitment 2026.
