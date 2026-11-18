# Gigmatch mobile UI

The Expo app contains the client-facing Gigmatch UI and the first API-backed
registration and login flow.

## Run locally

```bash
npm install
npm start
```

For a browser preview, run `npx expo start --web`. For an Android device, use
Expo Go to scan the development QR code or run `npm run android` with the
Android development environment installed.

## Connect to the API

The app defaults to `http://localhost:5000/api`, which works for a browser
preview on the same computer. Set `EXPO_PUBLIC_API_URL` in a local `.env` file
when connecting to another host:

- Android emulator: `http://10.0.2.2:5000/api`
- Physical phone: `http://<your-computer-lan-ip>:5000/api` (phone and computer
  must be on the same network)

Restart Expo after changing `.env`. The backend must also have MongoDB running
and a `JWT_SECRET` set. On native platforms, auth tokens are stored with Expo
SecureStore; in the web preview they remain in memory for the current page
session.

## GitHub-free Vercel preview

`vercel.json` builds the Expo web app from this directory, publishes `dist`,
and supports direct route refreshes. To deploy without linking GitHub, open a
terminal in `mobile` and run:

```bash
npx vercel login
npx vercel --prod
```

Follow the Vercel CLI prompts to authenticate and create the project. Later
updates can be deployed from the same directory with `npx vercel --prod`.
`npm run build:web` creates the static export locally if you want to inspect it
before deploying.

Client sign-in, bookings, messaging, and live musician/map results require a
publicly reachable API. Set `EXPO_PUBLIC_API_URL` in Netlify's site environment
or the Vercel project's environment variables to the hosted API URL ending in
`/api` before building (for example, `https://your-api-host.example/api`).
Configure the API's `CLIENT_URL` to the deployed site origin. Never put MongoDB
credentials or `JWT_SECRET` in frontend environment variables or the exported
site. Without a hosted API, the deployed site only supports the sample preview
and cannot provide end-to-end client testing.

## Screens

- Discover: artist search, genre and price filters, event-location proximity
  sorting with an interactive OpenStreetMap view, and artist cards
- Artist profile: artist details, sample availability, and booking entry point
- Booking request: authenticated request with event details and payment preference
- My bookings: request history, status, messaging, accept/reject, cancel, and completion actions
- Booking conversations: private client–musician messages, refreshed every five seconds
- Notifications: booking and message updates, with links back to the relevant screen
- Musician profile editor: draft and publish a profile for discovery
- About, Contact, and Feedback
- Sign in and account registration for clients and musicians

Artist profiles, ratings, prices, and availability are sample presentation
content. When the API is unavailable, Discover clearly switches to those sample
profiles. Sample profiles include a booking-form design preview; completing it
does not submit or store a booking. A sample bookings view is available after
the preview form. Contact and feedback submissions are local prototype
interactions. Signed-in booking requests for API-backed musician profiles are
submitted to the backend. Booking times use Philippine local time
(`Asia/Manila`).
Event venues/cities and musician service areas are sent to OpenStreetMap
Nominatim for proximity sorting; exact home addresses should not be entered.
The map loads OpenStreetMap tiles only when opened and shows approximate
musician service-area pins, not exact stored coordinates. An internet connection
is required. See the server README for geocoding and tile-service limits.
Booking dates are entered as `MM/DD/YYYY`, and start times use a 12-hour
`HH:MM` field with an AM/PM selector; stored event times remain in Philippine
local time (`Asia/Manila`).

## Notifications on mobile

The web app stores booking and message notifications in the signed-in user's
inbox. Native Android/iOS builds can also receive remote push notifications
while the app is in the background or closed. Push requires linking this Expo
project to EAS, setting an EAS project ID (`EXPO_PUBLIC_EAS_PROJECT_ID` or
`expo.extra.eas.projectId`), configuring Android FCM/iOS APNs credentials, and
installing an EAS development or production build on a device. Expo Go and the
Vercel web app do not provide native background push. On the web, open Alerts
and select a notification to navigate to its linked booking or conversation.
