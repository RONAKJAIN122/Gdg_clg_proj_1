# DESIGN.md — CampusDesk Architecture & Technical Design

This document answers key architectural and technical questions regarding the implementation of **CampusDesk (LNMIIT Smart Campus Resource Booking Portal)** for the GDG Fullstack Web Development Recruitment task.

---

## 1. Overlap-Check Logic & Back-to-Back Bookings

### The Overlap Formula
Two booking intervals, **Booking A** `[startA, endA]` and **Booking B** `[startB, endB]`, overlap if and only if:

$$\text{startA} < \text{endB} \quad \text{AND} \quad \text{startB} < \text{endA}$$

In SQLAlchemy / SQL, this condition is written as:
```python
and_(
    Booking.resource_id == requested_resource_id,
    Booking.status == BookingStatus.confirmed,
    Booking.start_time < requested_end_time,
    Booking.end_time > requested_start_time,
)
```

### Why Back-to-Back Bookings Pass
Consider two consecutive bookings for the same room:
- **Booking A**: `10:00 AM – 11:00 AM` (`startA = 10:00`, `endA = 11:00`)
- **Booking B**: `11:00 AM – 12:00 PM` (`startB = 11:00`, `endB = 12:00`)

Evaluating the overlap formula:
1. `startA < endB` $\rightarrow$ `10:00 < 12:00` $\rightarrow$ **TRUE**
2. `startB < endA` $\rightarrow$ `11:00 < 11:00` $\rightarrow$ **FALSE** (strict inequality `<`)

Since one condition is **FALSE**, the overall `AND` expression evaluates to **FALSE** (no overlap). Thus, back-to-back bookings succeed without conflict, allowing seamless back-to-back schedule reservations!

---

## 2. Double-Booking Race Condition & Concurrency Safe Locking

### The TOCTOU Problem
Without transaction isolation, two concurrent requests arriving within milliseconds experience a **Time-of-Check to Time-of-Use (TOCTOU)** race condition:

```
Thread A: Reads DB for conflicts at 10:00–11:00 → 0 conflicts found
Thread B: Reads DB for conflicts at 10:00–11:00 → 0 conflicts found  (both see empty slot)
Thread A: Inserts booking for 10:00–11:00 → Success
Thread B: Inserts booking for 10:00–11:00 → Success (DOUBLE BOOKING!)
```

### Our Solution: Pessimistic Row Locking (`SELECT FOR UPDATE`)
We wrap the resource lookup, conflict check, and insertion inside a single atomic database transaction using SQLAlchemy's `.with_for_update()` lock:

```python
async with db.begin():
    # Lock the specific resource row — all concurrent booking attempts for this resource queue here
    result = await db.execute(
        select(Resource).where(Resource.id == payload.resource_id).with_for_update()
    )
    resource = result.scalar_one_or_none()
    
    # Run overlap check while holding exclusive row lock
    overlap_result = await db.execute(
        select(Booking).where(
            Booking.resource_id == payload.resource_id,
            Booking.status == BookingStatus.confirmed,
            Booking.start_time < payload.end_time,
            Booking.end_time > payload.start_time,
        )
    )
    if overlap_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Time slot clashes with an existing booking")
        
    # Insert new booking
    db.add(new_booking)
# Transaction commits, changes persist, row lock is released for next request
```

### Why Database-Level Locking vs Application Locks?
- **Application Locks (`asyncio.Lock` / in-memory)**: Fail when the backend scales across multiple Uvicorn worker processes or cloud instances (e.g. Render cluster), as each process holds an isolated lock state.
- **Database `FOR UPDATE` Row Locks**: Enforced centrally by PostgreSQL across all connections, workers, and server instances, ensuring **100% race prevention under any concurrent load**.

---

## 3. Session Persistence & Auth State After Hard Refresh

### How the App Remembers Login State
1. **Token & User Storage**:
   When a user verifies their OTP (`POST /api/auth/verify-otp`), the server returns a JWT Bearer token and user profile object. The client saves these into browser `sessionStorage` (and `localStorage` backup):
   ```javascript
   sessionStorage.setItem('token', access_token);
   sessionStorage.setItem('user', JSON.stringify(user));
   ```

2. **React Context Initialization on Mount**:
   When the browser is refreshed or closed/reopened, `AuthContext.jsx` initializes its state directly from storage on component mount:
   ```javascript
   const [token, setToken] = useState(() => sessionStorage.getItem('token') || localStorage.getItem('token') || null);
   const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('user') || 'null'));
   ```

3. **Automatic Authorization Header**:
   An Axios request interceptor (`api/client.js`) automatically injects the JWT token into every API call:
   ```javascript
   client.interceptors.request.use((config) => {
     const token = sessionStorage.getItem('token') || localStorage.getItem('token');
     if (token) config.headers.Authorization = `Bearer ${token}`;
     return config;
   });
   ```

4. **Protected Route Guard & 401 Handling**:
   If an expired or invalid token is sent, the backend returns `401 Unauthorized`. An Axios response interceptor catches `401` errors, clears storage, resets `AuthContext`, and redirects the user to `/login`.

---

## 4. Technical Challenges & Debugging Case Studies

### Case 1: Render PostgreSQL SSL Connection Handshake Failure
- **Symptom**: Upon deploying the backend to Render with PostgreSQL, FastAPI threw `[SSL: WRONG_VERSION_NUMBER]` database connection errors during startup.
- **Root Cause**: Render internal database URLs (`dpg-...-a.singapore-postgres.render.com`) communicate over Render's isolated internal private network, which does not require external TLS wrapping. Standard SQLAlchemy asyncpg SSL parameters broke the connection.
- **Resolution**: Updated `database.py` to detect internal Render environment variables and configure connection arguments:
  ```python
  connect_args={"ssl": False} if "render.com" in settings.DATABASE_URL else {}
  ```

### Case 2: Timezone Offset Shifts & Python Datetime Comparison Crashes
- **Symptom**: Attempting to cancel a booking on PostgreSQL resulted in `HTTP 500 Server Error: TypeError: can't compare offset-naive and offset-aware datetimes`, while browser JavaScript converted a `10:00 AM` booking into `3:30 PM IST` (+5:30 offset shift).
- **Root Cause**: PostgreSQL `TIMESTAMP WITH TIME ZONE` columns return timezone-aware Python datetimes, which crash when compared directly against naive `datetime.utcnow()`. On the client side, appending `Z` to ISO strings caused JavaScript's `new Date()` to convert wall-clock time into local IST offset.
- **Resolution**:
  1. **Backend**: Standardized all server-side datetime comparisons using UTC-aware datetimes (`datetime.now(timezone.utc)` and `_to_utc()` helper).
  2. **Frontend**: Created a custom `parseNaiveDT` helper (`utils/format.js`) that parses ISO strings directly as exact wall-clock time (`new Date(year, month-1, day, hour, min)`), completely eliminating browser timezone offset shifts.

---

## 🚀 Summary Checklist

| Requirement | Implementation Status |
| :--- | :--- |
| **Email OTP + JWT Auth** | Completed (`/api/auth/send-otp`, `/api/auth/verify-otp`) |
| **Concurrency Lock** | Completed (`SELECT ... FOR UPDATE` in `booking_service.py`) |
| **Back-to-Back Bookings** | Completed (`startA < endB AND startB < endA`) |
| **APScheduler Reminders** | Completed (Runs every 60s, 12h AM/PM email alerts) |
| **Waitlist Auto-Promotion** | Completed (FIFO auto-promote & notify on cancellation) |
| **MakeMyTrip-Style UI** | Completed (Vite + React 18 + Vanilla CSS Design System) |
| **Live Deployments** | Completed (Vercel Frontend + Render FastAPI & PostgreSQL) |
