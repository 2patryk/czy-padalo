# Plan: "Did it rain?"

A website (Angular, SSR) that, for a given location, answers: **did it rain in the last 24h**, how many mm. City pages (`/lodz`, `/warszawa`, ...) are server-rendered for SEO. The project also serves as a way to learn good, current Angular patterns.

## Decisions log

Key decisions reached during design review, most-recent first (see `git log` on this file for how the plan evolved):

- **v2 design direction: "Kindle Paperwhite" e-ink aesthetic.** Warm off-white/cream background, near-black high-contrast text, serif typography, subtle borders instead of shadows, centered reading-width column. See "v2: Design overhaul & richer info" below.
- **v2 precip icons are driven by the 24h `mm` value, not `Station.statusCode`.** Originally planned to reuse `statusCode`, but real data showed it answers a different question ("is it precipitating right now") than the 24h verdict — e.g. Gdynia had `statusCode: "no-precip"` with `precip24HoursSum: 0.8mm`, making the icon contradict the text. `RainReport` now carries `hasData` (was `precip24HoursSum` present at all) instead, and the icon variant is derived from the same `mm`/`hasData` the verdict text already uses, so they can never disagree. Icons remain precipitation-only — no new weather data source (e.g. Open-Meteo) for sun/cloud/temperature.
- **v2 dark mode is system-driven only, no manual toggle.** Follows `prefers-color-scheme`; no UI switch, no persisted preference.
- **v2 "more info" = precipitation breakdown + hourly trend.** Show `lastHourPrecip`/`dailyPrecip`/6h/12h sums alongside the 24h total (all already fetched, just unused past `precip24HoursSum`), and add an hourly history view using `ImgwApiService.getStationHistory` (built in v1 step 11 but never wired into any UI).
- **Explicit `api/index.mjs` + `vercel.json` required for Angular SSR on Vercel (2026-07-01).** Vercel's zero-config Angular integration let filesystem routing serve the static `index.html` shell for every path before the SSR server ever ran (a known upstream issue, angular/angular-cli#30736) — all dynamic routes and `/api/stations` were silently broken in production despite working perfectly locally. Fixed by adding a Vercel Function (`api/index.mjs`) wrapping the compiled `server.mjs` `reqHandler`, with `vercel.json` rewrites forcing every request through it.
- **`security.allowedHosts` in `angular.json` must list the production Vercel host(s).** Angular's SSR host-header validation (SSRF protection) rejects any `Host` header not explicitly allowlisted, and defaults to an empty array (deny all) — this broke every request once the SSR fix above was deployed, with a distinct error ("Header host ... is not allowed"). Allowlisted `czy-padalo.vercel.app` and `*.patrykordons-projects.vercel.app`.
- **Vercel project is Git-connected (2026-07-01)**, replacing the manual `vercel deploy` used for the step-3 skeleton check. Every push to `main` now auto-deploys to production; other branches/PRs get preview deployments. This makes step 25 a verification step rather than a manual deploy.
- **MVP scope is 24h-only.** Week toggle and hourly breakdown are explicitly deferred past v1 — see "Out of scope for v1".
- **Styling: plain SCSS**, component-encapsulated (no Tailwind). Chosen for a more "native Angular" learning experience.
- **Testing: Vitest**, not Jasmine/Karma — current recommended default for new Angular projects.
- **Missing city route → redirect to `/`**, no message needed.
- **City list is a small hardcoded array** (slug, name, station code) for the ~20-30 largest Polish cities. Not a CMS/data file — extending it later is a one-line array edit.
- **Server-side in-memory cache with TTL**: station list ~1h TTL, per-station data ~5-10 min TTL. Protects the unofficial IMGW API from being hammered by SSR requests/crawlers and speeds up repeated renders.
- **No separate proxy service.** Angular SSR itself is the proxy: the server fetches from `hydro-back.imgw.pl`, so the browser never calls it directly and CORS is a non-issue.
- **Rendering: SSR (`ng new --ssr`), not CSR.** Reason: city pages need real, indexable content for SEO ("SEO + dynamic content → SSR" per Angular's own rendering decision matrix). GPS-based lookup on the homepage stays a client-side-only interaction after hydration (no SEO value there anyway).
- **Hosting: Vercel.** One deploy for both the Angular SSR app and its serverless functions — simplest setup for a first project.
- **UI/content language: Polish.** All user-facing text (labels, verdicts, error messages) is in Polish, since this is a Polish audience/service. Code, comments, and docs (`PLAN.md`, `CLAUDE.md`) stay in English — see `CLAUDE.md`.
- **Angular version: latest stable**, no pinning at `ng new` time.
- **Per-city SEO meta tags (`Title`/`Meta` services) are in v1**, not deferred — dynamic title + description with real verdict content is the whole point of using SSR, so it belongs in the city-route step, not a later "polish" pass.
- **UI is mobile-first.** Layout and styles are designed for small screens first, then progressively enhanced for larger viewports — most traffic (GPS "use my location" lookups) is expected to be on mobile.

## Scope (v1 / MVP)

- Server-rendered city pages: `/lodz`, `/warszawa`, etc. — each shows the 24h rain verdict for that city's nearest station, real HTML content for SEO.
- Homepage: "Use my location" button (Geolocation API, client-side only) **or** manual station search — both resolve to a rain verdict for the last 24h.
- Verdict: large "It rained" / "No rain" label + total mm + nearest station name + distance (for the GPS/search path).
- No user accounts, no query history, no notifications, no PWA/offline.

### Out of scope for v1 (planned for later)

- Week (7-day) range toggle — requires verifying the real backward reach of `hoursInterval` first.
- Hourly precipitation breakdown (chart/list).
- Sitemap generation.
- Full Polish city list beyond the initial ~20-30.

## Data source

IMGW hydro API (unofficial), called **server-side only**:

- `GET https://hydro-back.imgw.pl/list/meteo` — station list: `id`, `code`, `name`, `lat`, `lon`, `precip24HoursSum`, `dailyPrecip`, etc.
- `GET https://hydro-back.imgw.pl/station/meteo/data?id=<code>&hoursInterval=<n>` — hourly history for a station (note: the `id` query param actually takes the `code` field from the list, not `id`).
- `GET https://hydro-back.imgw.pl/map/stations/meteorologic?onlyMainStations=false` — alternate station list (map-marker shaped: `id`, `c`, `n`, `lo`, `la`, `s` precip-state category). Confirmed working but returns a category string, not a raw mm sum like `/list/meteo`'s `precip24HoursSum` — evaluate at step 4 (model definition) whether it's useful as a supplement or can be ignored in favor of `/list/meteo`.

Gotchas to keep in mind in code (and unit-test):

- **All `hydro-back.imgw.pl` requests return 403 without browser-like headers.** Confirmed: a plain request with no `User-Agent`/`Referer` is rejected; adding `User-Agent: Mozilla/5.0 ...` and `Referer: https://hydro.imgw.pl/` returns 200. `imgw-api.service.ts` must always send these headers server-side.
- `id` ≠ `code` — always map through `code`.
- Timestamps in responses are UTC — convert to local time (Europe/Warsaw) for display.
- Verify the actual backward reach of `hoursInterval` (does it work for 168h?) before building the week feature.
- The API is unofficial — it may change without notice; keep all API communication in one service (`ImgwApiService`) so a contract change only requires editing one place.
- Confirmed via a real sample of `/list/meteo` (874 stations, 2026-07-01): precip fields (`lastHourPrecip`, `dailyPrecip`, `precip24HoursSum`, etc.) can be `null` for some stations — model them as nullable.
- Real `statusCode` values seen in the sample: `no-precip`, `precip`, `high-precip`, `no-precip-data`, `no-hours-precip-data`.

## Angular architecture

Angular (latest stable), SSR enabled, standalone components, signals, no NgModules.

```
src/app/
  core/
    services/
      imgw-api.service.ts       // server-side HTTP calls to IMGW + in-memory TTL cache
      stations.service.ts       // station list access, nearest-station lookup (Haversine)
      geolocation.service.ts    // client-side wrapper around navigator.geolocation
      rain-report.service.ts    // combining logic: station -> verdict (24h)
    models/
      station.model.ts
      rain-report.model.ts
    data/
      cities.ts                  // hardcoded { slug, name, stationCode }[] for launch cities
  features/
    city-page/
      city-page.component.ts     // SSR route (/:citySlug), resolves verdict server-side
    location-picker/
      location-picker.component.ts   // GPS button + station-search input (homepage, client-side)
    rain-verdict/
      rain-verdict.component.ts      // presentational: yes/no verdict + mm + station name
  shared/
    pipes/
      mm.pipe.ts                     // formats "12.4 mm"
  app.routes.ts                       // '/', '/:citySlug' (redirect to '/' if slug unknown)
  app.config.ts                       // provideHttpClient, SSR providers
```

### Patterns to apply (learning goal)

- **Standalone components**, no NgModules.
- **Signals** (`signal`, `computed`, `effect`) for local/client state; `resource()` for async data fetching where it fits.
- **`inject()`** instead of constructor injection.
- **OnPush change detection** everywhere.
- **Smart/dumb component split**: `rain-verdict` is a presentational component (`input()` only), logic lives in services.
- Unit tests (Vitest) for pure logic: `id`→`code` mapping, Haversine, UTC→local time conversion, cache TTL behavior.

## Implementation steps

Each step below is presented to the user for acceptance before being implemented, and checked off only after the user accepts the result — see `CLAUDE.md`.

- [x] 1. `ng new czypadalo --ssr --style=scss` with Vitest as the test runner; verify `ng serve` runs.
- [x] 2. Verify `ng build` succeeds on the generated skeleton.
- [x] 3. Deploy the unmodified skeleton to Vercel to confirm the SSR → serverless-function chain works end to end.
- [x] 4. Add ESLint via `ng add @angular-eslint/schematics`.
- [x] 5. Add husky + lint-staged pre-commit hook running ESLint + Prettier on staged files.
- [x] 6. Add commitlint (husky `commit-msg` hook) enforcing the commit message convention from `CLAUDE.md`.
- [x] 7. Define TS models (`station.model.ts`, `rain-report.model.ts`) from a real sample response of `/list/meteo` and the `data` endpoint.
- [x] 8. `imgw-api.service.ts`: `getStations()` method only (no cache yet), called server-side.
- [x] 9. Add in-memory TTL cache to `getStations()` (~1h TTL).
- [x] 10. `imgw-api.service.ts`: `getStationHistory(code, hoursInterval)` method, no cache yet.
- [x] 11. Add in-memory TTL cache to `getStationHistory` (~5-10 min TTL).
- [x] 12. `cities.ts` with the initial hardcoded city → station list (start with a handful, e.g. 3-5, to validate the shape before filling in all ~20-30).
- [x] 13. `rain-report.service.ts`: 24h verdict logic given a station code (uses `precip24HoursSum`).
- [x] 14. `rain-verdict.component.ts`: presentational component rendering the verdict (yes/no + mm + station name), no real data yet (static/mock input).
- [x] 15. `city-page.component.ts` + `/:citySlug` route wiring: server-rendered, uses `rain-report.service.ts` + `rain-verdict.component.ts` for a real city.
- [x] 16. Unknown-slug redirect to `/`.
- [x] 17. Dynamic `Title`/`Meta` tags on the city page (title + description built from the real verdict).
- [x] 18. Fill in the rest of the initial city list (~20-30 cities total).
- [x] 19. `geolocation.service.ts` wrapping `navigator.geolocation.getCurrentPosition`, with permission-denial handling.
- [x] 20. Haversine nearest-station lookup in `stations.service.ts`.
- [x] 21. Homepage `location-picker.component.ts`: GPS button wired to geolocation + nearest-station lookup, feeding `rain-verdict`.
- [x] 22. Homepage manual station search (text input filtering the station list), feeding `rain-verdict`.
- [x] 23. Error/loading states: GPS denied, network error, no station in range, partial API data.
- [x] 24. Unit tests (Vitest) for pure logic: `id`→`code` mapping, Haversine, UTC→local time conversion, cache TTL behavior.
- [x] 25. Verify the completed v1 on the latest Vercel production deployment. (No manual deploy step needed — the Vercel project is Git-connected as of 2026-07-01, so every push to `main` auto-deploys to production.)

## Risks

- The API is unofficial — a contract change could break the app silently; isolate all calls in `ImgwApiService`.
- `hoursInterval` reach needs verification before the (deferred) week feature is built.

---

## v2: Design overhaul & richer info

v1 is functionally complete but visually bare (unstyled, left-aligned, no dark mode, minimal information). v2 focuses purely on design and information density — no new data sources, no new pages.

### Scope (v2)

- **"Kindle Paperwhite" visual design**: warm paper-like background, high-contrast near-black ink text, serif typography, subtle borders (no drop shadows), generous whitespace, centered reading-width column on every page.
- **Dark mode** via `prefers-color-scheme`, no manual toggle — an inverted "night e-ink" palette (near-black background, warm off-white text), same typography and layout.
- **Simple precipitation icons** (no rain / light rain / heavy rain) driven by the real `statusCode` field already returned by `/list/meteo`, shown next to the verdict on both city pages and the GPS/search result.
- **Precipitation breakdown**: show `lastHourPrecip`, `dailyPrecip`, and the 6h/12h sums alongside the existing 24h total.
- **Hourly precipitation history**: a simple list (not a chart library) of the last 24h using the existing `getStationHistory` endpoint, shown on both city pages and the GPS/search result.
- **Custom favicon** matching the precip-icon visual identity, replacing the default Angular one.
- **Per-city Open Graph image** for social sharing previews of city pages.

### Out of scope for v2

- Any new external weather data source (sun/cloud/temperature icons).
- Manual dark-mode toggle or persisted theme preference.
- Chart library / visualization — history is a plain list.
- Week view, sitemap, remaining out-of-scope-for-v1 items (still deferred).

### Implementation steps

- [x] 26. Define "Kindle paper" design tokens (CSS custom properties for light + dark via `prefers-color-scheme`: background, ink/text color, accent, border, serif font stack, spacing scale) in `styles.scss`.
- [x] 27. Centered reading-width layout: wrap route content in a consistent max-width centered container, applied globally (`app.html`/`app.scss`).
- [x] 28. Restyle `rain-verdict.component` with the new design tokens (typography, spacing, borders).
- [x] 29. Restyle `location-picker.component` (button, search input, results list) with the new design tokens.
- [x] 30. Add a shared `precip-icon` component with no-precip/light/heavy variants driven by the 24h `mm` value (not `Station.statusCode` — see decisions log), wired into `rain-verdict.component`.
- [x] 31. Extend `RainReport` model + `RainReportService` with `lastHourPrecip`, `dailyPrecip`, 6h and 12h sums.
- [x] 32. Display the precipitation breakdown (from step 31) in `rain-verdict.component`.
- [x] 33. Add `precip-history.component` rendering the last 24h hourly breakdown as a plain list, using the existing (currently unused) `ImgwApiService.getStationHistory`.
- [x] 34. Wire `precip-history.component` into `city-page.component` and the GPS/search result in `location-picker.component`.
- [x] 35. Verify dark mode end-to-end (both themes, every page/component) and check WCAG AA contrast + icon accessibility (ARIA labels).
- [x] 36. Add a custom favicon matching the app's precip-icon visual identity, replacing the default Angular favicon.
- [ ] 37. Generate a per-city Open Graph image (`og:image`) for social sharing previews, wired into `city-page.component`'s `Meta` tags.

## Risks (v2)

- `statusCode` categories (`no-precip`, `precip`, `high-precip`, `no-precip-data`, `no-hours-precip-data`) don't map 1:1 to a clean 3-icon scheme — the two "no data" variants need a deliberate fallback icon, not just an error state.
- `getStationHistory`'s real backward reach for `hoursInterval` was never verified (see top-level Risks) — step 33 should confirm 24h actually returns 24 distinct hourly entries before building the list UI around it.
