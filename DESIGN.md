# DESIGN.md — CampusDesk Technical Design

## Concurrency-Safe Booking

### The Problem

When two users attempt to book the same resource at overlapping times nearly simultaneously (within milliseconds), a naive implementation has a TOCTOU (time-of-check to time-of-use) race condition:

```
User A reads bookings → no conflict
User B reads bookings → no conflict   ← both see empty before either writes
User A writes booking → success
User B writes booking → success        ← double booking!
```

### Our Solution: SELECT FOR UPDATE on the Resource Row

We use PostgreSQL's row-level locking primitive inside a transaction.

```python
async with db.begin():
    # Lock the resource row — all concurrent booking attempts queue here
    resource = await db.execute(
        select(Resource).where(Resource.id == resource_id).with_for_update()
    )
    # Now check for overlaps — safe because only one transaction is here at a time
    # ... overlap query ...
    # Insert booking
    db.add(Booking(...))
# Transaction commits, lock releases, next waiter proceeds
```

**How it handles millisecond races:**
1. Both requests begin a transaction and try to lock the same resource row.
2. The database grants the lock to whichever arrived first (at the DB level, not application level).
3. The second request **blocks** at the `FOR UPDATE` lock, not at the application layer.
4. Request 1 completes its overlap check (no conflict), inserts the booking, commits, releases the lock.
5. Request 2 now acquires the lock, runs its overlap check, **sees request 1's booking**, and returns 409.

**No double booking is possible** because the overlap check and the insert happen inside the same locked transaction.

### Why not application-level locks (asyncio.Lock, Redis)?

- Application locks only work within a single process. Under load with multiple workers (e.g., 4 uvicorn workers), each process has its own lock — they can't see each other.
- Database locks work across all connections, all workers, all machines.

### Why not optimistic locking with version numbers?

- Optimistic locking works best when conflicts are rare and retrying is cheap.
- For bookings, a conflict means the user needs to pick a different time — we want to tell them immediately, not retry silently. Pessimistic locking (`FOR UPDATE`) is the right fit.

### SQLite in Development

SQLite with aiosqlite is inherently single-writer (one write at a time). `FOR UPDATE` is accepted but has no effect — SQLite's write serialisation provides the same guarantee. The code is identical between dev and prod; only the `DATABASE_URL` changes.

### The Overlap Formula

```
Two bookings A and B overlap if and only if:
    startA < endB  AND  startB < endA

Back-to-back bookings (10:00–11:00 and 11:00–12:00) do NOT overlap:
    startB = endA → startB < endA is FALSE → no overlap ✓
```

---

## Bonus Features

### Waitlist

When a confirmed booking is cancelled:
1. The first `WaitlistEntry` for that booking (ordered by `joined_at`, FIFO) is found.
2. A new confirmed booking is created for the waiter with the same resource/time slot.
3. The waiter's `WaitlistEntry` is deleted.
4. An email is sent to the promoted user.
5. Everything happens inside the same cancel transaction — atomic.

### Dark/Light Theme

CSS custom properties (`--color-*` tokens) are defined on `:root` for light mode and overridden under `[data-theme="dark"]` on `<html>`. The user's preference is stored in `localStorage`. The system preference (`prefers-color-scheme`) is used as the default.

---

## API Design

- All endpoints return a consistent JSON envelope.
- Error responses always include a `detail` field (string or object with field-level errors).
- Status codes are strictly followed: 200/201 success, 400 validation, 401 auth, 403 permission, 404 not found, 409 conflict, 429 rate limit.

## Database Schema

See `app/models.py` for full SQLAlchemy models with relationships and constraints.

Key constraints:
- `users.email` — UNIQUE
- `waitlist_entries.(user_id, booking_id)` — UNIQUE (can't join waitlist twice)
- All foreign keys have `ondelete="CASCADE"`
