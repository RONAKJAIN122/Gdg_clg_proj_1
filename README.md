# 🏛️ LNMIIT Smart Campus Resource Booking Portal (CampusDesk)

[![Live App](https://img.shields.io/badge/Live_App-Vercel-success?style=for-the-badge&logo=vercel)](https://gdg-clg-proj-1.vercel.app)
[![API Docs](https://img.shields.io/badge/API_Docs-FastAPI-blue?style=for-the-badge&logo=fastapi)](https://lnmiit-booking-backend-430o.onrender.com/docs)
[![Python](https://img.shields.io/badge/Backend-FastAPI_Python_3.11-darkgreen?style=for-the-badge&logo=python)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_Vite-navy?style=for-the-badge&logo=react)](https://react.dev)

A full-stack enterprise campus resource reservation engine built for **The LNM Institute of Information Technology (LNMIIT), Jaipur**. Enables students, faculty, and administrators to reserve Auditoriums, Lecture Halls, Photography & Media Gear (Sony DSLRs, Tripods, Mics), Discussion Rooms, and SAC Sports Grounds — featuring zero double-bookings, real-time availability timelines, and automated email reminders.

---

## 📹 Demo Video

- 🎥 **Walkthrough Video Link (YouTube)**: [https://www.youtube.com/watch?v=7YGtv29cGJ4](https://www.youtube.com/watch?v=7YGtv29cGJ4) *(1 min 40 sec walkthrough of application workflow, passwordless OTP sign-in)*


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

3. **Automated Reminders**:
   - Sends email reminders 1 hour before booking start (formatted cleanly in 12-hour AM/PM time).
   - Auto-marks past confirmed bookings as `completed`.

4. **MakeMyTrip-Style Production UI/UX**:
   - Full hero section with official LNMIIT building backdrop.
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

## 📄 Documentation

- 📘 [`DESIGN.md`](./DESIGN.md) — Comprehensive technical design document covering overlap math, concurrency protection, state persistence, and debugging case studies.

