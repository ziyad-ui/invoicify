# Invoicify — Frontend (React + Vite)

Client invoicing and payment monitoring UI for **Love Realty**. It talks to the Laravel API that
`../backend-overlay/setup.ps1` builds at `../invoicify-api`. All mock data has been removed — every
screen loads real data.

## Run
```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env   (set VITE_API_URL if the API isn't on localhost:8000)
npm run dev                 # http://localhost:5173
```
Start the API first (`php artisan serve`), then sign in with a seeded account
(password `password123`): `owner@loverealty.com`, `staff@loverealty.com`, `juan.delacruz@example.com`.

## Stack
React 18 · Vite · React Router 6 · Tailwind CSS · Axios

## Structure
```
src/
  api/http.js         axios instance, Bearer token, 401 handling, error parsing (Laravel 422 -> form fields)
  api/services.js     one function per API endpoint (the ONLY place that knows URLs)
  hooks/useFetch.js   loading / error / reload for every page
  context/AuthContext.jsx   login, logout, session restore (GET /api/me)
  components/         Button, Card, Table, Modal, FormField, StatusBadge, Toast, BarChart, ErrorState, ...
  layouts/            Sidebar + InternalLayout (owner/staff), ClientPortalLayout
  routes/ProtectedRoute.jsx   role-based route guard (the API enforces the same rules)
  pages/              Login, internal/* (owner + staff), portal/* (client)
```

## Data flow
Page → `useFetch` / handler → `api/services.js` → axios (`http.js`) → Laravel API → JSON → page state → components.
Validation errors from the API (HTTP 422) are mapped back onto the matching form fields.

## Notes
* The token is kept in `localStorage` (`invoicify_token`) and expires after 8 hours.
* Payments are never processed online — staff record payments made by cash, bank transfer or check.
