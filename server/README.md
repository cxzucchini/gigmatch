# Gigmatch Server

Express + MongoDB API for Gigmatch.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to a running local MongoDB instance or your MongoDB Atlas connection string.
3. Replace `JWT_SECRET` with a long, random secret. Never commit `.env`.
4. Install and start the API:

```bash
npm install
npm run dev
```

The API listens on port `5000` by default. It stays available if MongoDB is
temporarily unavailable, but database-backed endpoints return `503` until the
database connects. Check `GET /api/health` for service and database status.

The Express app can also be deployed to Vercel from this directory without
linking a GitHub repository. Set `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL`
as Vercel server-side environment variables before deploying. Vercel Functions
connect to MongoDB on demand and reuse the connection while the function stays
warm.

To add fictional test artist profiles around Iloilo, with `MONGODB_URI` set in
`server/.env`, run:

```bash
npm run seed:test-musicians
```

The seed is safe to rerun and only updates accounts with the
`gigmatch.seed.iloilo.*@example.com` addresses. These musician accounts receive
unshared random passwords; use them to test client discovery and booking, not
musician sign-in. The existing musician test account can be used to exercise
musician booking actions.

## Authentication endpoints

- `POST /api/auth/register` — create a `client` or `musician` account. Requires
  `name`, `email`, `password` (8–72 characters), and optional `role`.
- `POST /api/auth/login` — authenticate with `email` and `password`.
- `GET /api/auth/me` — return the authenticated account. Requires
  `Authorization: Bearer <token>`.
- `GET /api/musicians` — list published profiles. Supports `genre`,
  `location`, `minRate`, `maxRate`, `q`, `near`, `page`, and `limit` query
  parameters. `near` geocodes an event venue or city and sorts profiles from
  nearest to farthest; profiles without mapped service areas appear last. This
  response includes event coordinates and approximate musician map coordinates
  rounded to two decimal places. Map coordinates are returned only for nearby
  searches; public profile endpoints do not expose stored coordinates.
- `GET /api/musicians/:id` — retrieve a published musician profile.
- `GET /api/musicians/me` and `PUT /api/musicians/me` — view or update the
  authenticated musician's profile. The profile must have a bio, genre, rate,
  and general service area before it can be published. An optional `contactPhone`
  is shown on the public musician profile for clients who prefer calling or
  texting outside Gigmatch chat. General service areas are geocoded and stored
  as coordinates; exact home addresses should not be entered or stored.
- `GET /api/musicians/me/availability` and `PATCH /api/musicians/me/availability`
  — musicians can view or block/reopen a date with `{ "date": "YYYY-MM-DD",
  "unavailable": true }`. Dates are open by default. Published profile
  availability is exposed by `GET /api/musicians/:id/availability`; it returns
  blocked dates and dates with accepted bookings. Booking requests on blocked
  dates or at times that overlap an accepted booking are rejected.
- `POST /api/bookings` — clients create a booking request. `eventDate` uses
  `YYYY-MM-DD`; `startTime` uses 24-hour `HH:mm` in `Asia/Manila`;
  performance duration is 1–12 whole hours.
- `GET /api/bookings/mine` — list the authenticated user's bookings.
- `GET /api/notifications/mine` — list the authenticated user's latest 50 notifications.
- `PATCH /api/notifications/:id/read` — mark one of the user's notifications as read.
- `POST /api/notifications/push-token` and `DELETE /api/notifications/push-token`
  — register or remove the signed-in user's Expo push token.
- `GET /api/bookings/:id/messages` — list the latest 100 messages for a booking.
- `POST /api/bookings/:id/messages` — send a message (`text`, up to 2,000
  characters). Only the booking's client and assigned musician may read or send
  messages.
- `PATCH /api/bookings/:id/status` — assigned musicians accept or reject a
  pending request or complete an accepted booking; clients can cancel their
  pending or accepted request.

Passwords are hashed before storage. Tokens expire after seven days. Admin
accounts cannot be created through public registration.

Accepting a booking checks musician-blocked dates and overlapping accepted
bookings on the server. The check is performed in a MongoDB transaction, so use
MongoDB Atlas or a local replica set for booking acceptance; a standalone
MongoDB instance does not support transactions.
Booking date/time values are stored with an explicit `Asia/Manila` time zone.

## Environment variables

- `PORT` — server port (default `5000`)
- `MONGODB_URI` — MongoDB connection URI (default local database)
- `JWT_SECRET` — secret used to sign access tokens; required for auth
- `CLIENT_URL` — optional allowed CORS origin

## Proximity sorting

Location lookups use OpenStreetMap Nominatim (`nominatim.openstreetmap.org`).
Event venue/city text and musician general service areas are sent to that
service for geocoding. Lookups are cached for 24 hours and rate-limited to one
request per 1.1 seconds to respect the public service policy. The mobile UI
shows `© OpenStreetMap contributors` attribution. Public Nominatim is suitable
for this MVP's low-volume testing, not guaranteed or high-volume production
use; switch to a contracted geocoding provider before growing usage.

The nearby-results map uses OpenStreetMap's public tile server and only loads
tiles when a user opens the map. Tile availability is best-effort; do not
prefetch tiles or promise offline map access. See the
[OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
before increasing map traffic or deploying to production.

Booking conversations are private to the booking's client and assigned
musician. Booking requests, status changes, and new messages are saved to the
recipient's notification inbox and dispatched to registered Expo push tokens.
Push is best-effort; notification persistence and booking/message operations do
not depend on push delivery. Native background push additionally requires EAS
and valid FCM/APNs credentials. Venue coordinates are exposed only in
authenticated booking listings for the booking's participants; pins are
approximate and are geocoded from the supplied venue and service area.
