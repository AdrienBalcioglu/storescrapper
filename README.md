# Store Metadata Widget

A small backend and a React widget that show whether a mobile app is live on the App Store and Google Play, with its rating, number of ratings and current version.

Built as a prototype for a dashboard: give it an iOS bundle ID and an Android package name, and it answers "is my app live, and how is it rated?" without any store API key.

## Backend (`/backend`)

Node.js, Express and TypeScript. It resolves apps with the `app-store-scraper` and `google-play-scraper` libraries and caches results in memory (`node-cache`, one hour by default).

```
GET /api/public-store-metadata?iosBundleId=<id>&androidPackageName=<name>&forceRefresh=true|false
```

```json
{
  "ios": {
    "isLive": true,
    "rating": 4.8,
    "ratingsCount": 1200,
    "currentVersion": "1.0.0",
    "storeUrl": "https://apps.apple.com/..."
  },
  "android": {
    "isLive": true,
    "rating": 4.6,
    "ratingsCount": 700,
    "currentVersion": "1.0.0",
    "storeUrl": "https://play.google.com/..."
  }
}
```

An app that is missing or not found returns `{ "isLive": false }`. Store errors are logged and returned as `isLive: false`, so the dashboard stays responsive.

```bash
cd backend
cp .env.example .env
npm install
npm run dev            # port 4000
```

| Variable | Default | Role |
| --- | --- | --- |
| `PORT` | `4000` | Port of the API |
| `CACHE_TTL_SECONDS` | `3600` | How long a store answer is cached |
| `CORS_ORIGINS` | `http://localhost:5173` | Browser origins allowed to call the API |
| `RATE_LIMIT_PER_MINUTE` | `30` | Requests allowed per IP and per minute |

## Frontend (`/frontend-app`)

Vite, React and TypeScript. The `AppStoreStatus` component handles the loading, error, not-live and success states. Its refresh button sends `forceRefresh=true` to bypass the cache.

```bash
cd frontend-app
cp .env.example .env   # backend URL and the bundle IDs to display
npm install
npm run dev            # port 5173
```

The demo page reads `VITE_IOS_BUNDLE_ID` and `VITE_ANDROID_PACKAGE_NAME` from the environment. In a real dashboard, pass them to the component as props.

## Trying it

1. Start the backend, then the frontend.
2. Open `http://localhost:5173`: the widget calls the API on load.
3. Click "Refresh store data" to bypass the cache.

## Notes

- The API is public by design and holds no secret. It is protected by a CORS allow-list, a per-IP rate limit and input validation, so it cannot be used as an open scraping proxy.
- The scraping libraries read public store pages. For production use with an SLA, plug a paid provider into `storeMetadataProvider.ts` and keep its key on the server.
- `google-oauth-sandbox/` is a separate local experiment with the Google OAuth flow. It displays tokens on the page: run it on your machine only, never deploy it.

## License

[MIT](LICENSE) © 2026 Adrien Balcioglu
