Express Mongo Cab API

Quick start

1. Copy env

```
cp .env.example .env
```

2. Start server

```
npm start
```

If local Mongo is not available, the app falls back to in-memory Mongo.

API Highlights
- Auth: `/api/v1/auth/*`
- Bookings CRUD, lifecycle, estimate: `/api/v1/bookings/*`
- Drivers CRUD, availability, nearby: `/api/v1/drivers/*`
- Assignments CRUD: `/api/v1/assignments/*`
- Trips CRUD: `/api/v1/trips/*`
- Live positions: `/api/v1/live/*`
- Pricing CRUD and real-time updates: `/api/v1/pricing/*`

Socket.io broadcasts:
- `driver:position`, `pricing:update`, `booking:update`, `booking:assigned`

Microservices and External User Service

- Booking Service: `npm run start:booking` exposes `/v1/bookings`, `/v1/assignments`, `/v1/trips`
- Discovery/Pricing Service: `npm run start:discovery` exposes `/v1/drivers`, `/v1/mapping`
- User Proxy Service: `npm run start:userproxy` exposes read-only proxies:
  - `/v1/passengers` -> external user service passengers
  - `/v1/drivers` -> external user service drivers

Environment configuration

Set these to integrate with the external user microservice:

- `AUTH_BASE_URL` base URL for listing users (optional)
- `PASSENGER_LOOKUP_URL_TEMPLATE` like `https://auth.example.com/api/passengers/{id}`
- `DRIVER_LOOKUP_URL_TEMPLATE` like `https://auth.example.com/api/drivers/{id}`
- `AUTH_SERVICE_BEARER` optional bearer for service-to-service calls

JWT verification options (optional):

- `AUTH_JWKS_URL`, `AUTH_AUDIENCE`, `AUTH_ISSUER` for RS256
- or `JWT_SECRET` for HMAC fallback

Development

Run all services in parallel:

```
npm run start:all
```

