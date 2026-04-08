# Basecamp Hub — Requirements

## What It Is
An internal web app for all Basecamp Coffee employees across all departments and locations.

---

## Users & Access
- Every employee has their own login account
- Roles: **Barista**, **Manager**, **HR**, **Accountant** (and other departments)
- Each employee belongs to one location (45 locations total)

---

## Features

### 1. Employee Directory
- See all coworkers at your location
- Name, role/position, department, contact info
- Their manager's name
- Work anniversary (day + month, no year)
- Years with the company
- Profile photo

### 2. Weekly Schedule
- Each employee sees their own location's schedule only
- Schedule is auto-generated each week
- Constraints:
  - Baristas cannot work more than 5 days in a row
  - Shifts are 8 hours only
  - 3 baristas per shift per location
- Manager reviews and approves the schedule **every Friday** before it goes live

### 3. Vacation Requests
- Employee submits a vacation request
- Manager gets in-app + email notification
- Manager approves or denies
- Employee gets notified of the decision

### 4. Shift Swaps
- Employee can request to swap a shift with a specific coworker, or post it open to "anyone"
- The other person (or anyone who picks it up) must accept
- Request can only be made **72 hours or more in advance**
- Both parties get in-app + email notification
- Manager is notified when a swap is accepted

---

## Notifications
- In-app + email for:
  - Vacation request received (manager)
  - Vacation request approved/denied (employee)
  - Shift swap request received
  - Shift swap accepted/declined

---

## Tech Notes
- Deploy on Vercel
- Needs a database (schedules, users, requests)
- Individual login accounts (not a shared link)
- Mobile-friendly
