# Learning notes

Brief notes on Angular patterns used in this project, added as steps are completed.

## Step 1 — `ng new czypadalo --ssr --style=scss`

- Standalone bootstrap: `src/main.ts` calls `bootstrapApplication`, no `AppModule`.
- SSR scaffolding: `src/main.server.ts` + `src/server.ts` (Express-based request handler) + `app.config.server.ts` (server-only providers merged with `app.config.ts` via `mergeApplicationConfig`).
- `app.routes.server.ts` defines per-route rendering mode (defaults to `RenderMode.Prerender`) — will need `RenderMode.Server` for city pages once dynamic data is involved.
- Test runner: Vitest (CLI 22 default), spec file colocated as `app.spec.ts`.

## Step 8 — `imgw-api.service.ts`

- `@Service()` decorator (Angular v22+) used instead of `@Injectable({providedIn: 'root'})` — auto-provided singleton, no explicit `providedIn` needed.
- `inject()` for `HttpClient` instead of constructor injection.
- `provideHttpClient()` in `app.config.ts`: `FetchBackend` is the default `HttpBackend` in v22, so `withFetch()` is deprecated/unnecessary — just call `provideHttpClient()`.

## Step 9 — TTL cache on `getStations()`

- No built-in Angular primitive for cross-request server-side TTL caching: `resource()`/`httpResource()` are component-bound reactive fetchers (re-run on signal/param change, no TTL); `withHttpTransferCache` only dedupes SSR↔browser requests within a single render, not across separate incoming requests.
- Used the standard RxJS pattern instead: `shareReplay(1)` on the `HttpClient` observable, gated by a manually tracked `expiresAt` timestamp.

## Step 14 — `rain-verdict.component.ts`, `mm.pipe.ts`

- `input.required<T>()` for a presentational component's single data-in — no defaults, compile-time enforced.
- `computed()` derives the verdict label text from the input signal instead of a template `@if`/`@else` pair.
- Standalone `Pipe` (`MmPipe`) for the reusable `"X.X mm"` formatting, per the project's `shared/pipes/` convention — kept separate from the component so other features (location-picker, later) can reuse it.
- Verified manually via temporary mock wiring in `app.ts`/`app.html` + `ng serve`, since nothing routes to this component until step 15 (city-page).

## Step 15 — `city-page.component.ts` + `/:citySlug` route

- `ResolveFn` (`city-page.resolver.ts`) fetches the `RainReport` before navigation, keeping `CityPageComponent` free of async/loading logic — it just renders an already-resolved value.
- `withComponentInputBinding()` added to `provideRouter()` so the resolved `report` data binds straight to the component's `input()` (`resolve: { report: ... }` key matches the input name), no manual `ActivatedRoute` reads.
- `app.routes.server.ts`: added `{ path: ':citySlug', renderMode: RenderMode.Server }` — city pages need per-request dynamic rendering (live IMGW data), unlike the prerendered catch-all.
- Verified against live data via `ng serve` + `/warszawa`: real IMGW station data flows through resolver → component → `rain-verdict`.

## Step 16 — unknown-slug redirect

- `ResolveFn` can return a `RedirectCommand` (built via `Router.parseUrl()`) instead of resolved data — the router navigates there and never activates the route, so `CityPageComponent` never has to handle a "not found" state itself.
- Applied the same `RedirectCommand` fallback when a valid slug's station has no matching data (`RainReportService.getRainReport` returns `null`), since both cases have the same "nothing to show" outcome — kept the component's `report` input as a plain, non-nullable `RainReport`.
- Verified via `ng serve`: `/warszawa` → 200, `/nonexistent-city` → 302 to `/`.

## Step 17 — dynamic `Title`/`Meta` tags

- Injected `Title`/`Meta` (`@angular/platform-browser`) in `CityPageComponent`'s constructor, but did the actual `setTitle`/`updateTag` calls inside an `effect()` rather than the constructor body — signal inputs (`report`, `citySlug`) aren't guaranteed to have a value yet when the constructor runs, and `effect()` re-runs automatically if the resolved data changes for a reused route instance.
- `citySlug` is a plain `input.required<string>()` bound automatically from the `:citySlug` route param via `withComponentInputBinding()` (added in step 15) — no manual `ActivatedRoute` read needed.
- Verified via `ng serve` + `curl` on `/lodz`: real `<title>` and `<meta name="description">` reflecting the live verdict.

## Step 18 — full city list

- No Angular pattern here — matched each of the ~30 largest Polish cities to its nearest real IMGW station via Haversine distance against the live `/list/meteo` response (one-off script, not checked in), since `hydro-back.imgw.pl` station names don't always match city names exactly (e.g. `GDAŃSK-PORT PÓŁNOCNY`).
- Spot-verified several new routes (`/gdansk`, `/rzeszow`, `/tychy`, `/elblag`, `/olsztyn`) via `ng serve` — each resolves real live data end-to-end.

## Step 19 — `geolocation.service.ts`

- Wrapped the callback-based `navigator.geolocation.getCurrentPosition` in a plain RxJS `Observable`, matching the `imgw-api.service.ts` convention of exposing Observables rather than Promises from services.
- Guarded with `isPlatformBrowser(inject(PLATFORM_ID))` before touching `navigator` — this service is meant for client-only use, but Angular still constructs it during SSR if it's ever injected in a component rendered on the server.
- Modeled the failure states as a discriminated union (`GeolocationError`, in `core/models/geolocation.model.ts`) instead of re-throwing the raw `GeolocationPositionError`, so consumers can `switch` on `.type` without depending on the DOM error-code constants.
- Verified both the success and `permission-denied` paths in a live browser session by temporarily overriding `navigator.geolocation.getCurrentPosition` via devtools and calling the service through `ng.getComponent()` — real permission-prompt UI can't be driven by browser automation, so mocking the browser API was the practical way to exercise both branches.

## Step 20 — `stations.service.ts`

- Reused `Coordinates` from `geolocation.model.ts` for both the GPS result and the station lat/lon, so `findNearestStation` takes the same shape the homepage's GPS button will eventually produce.
- Plain loop over `Station[]` tracking a running minimum rather than `Array.sort()` — avoids an O(n log n) sort when only the single closest station is needed.
- Verified the Haversine formula against a real sample of `/list/meteo` (874 stations) in a throwaway Node script: Warszawa's city-center coordinates correctly resolve to `WARSZAWA-MŁK`, the actual nearest station (~2.5 km).

## Step 21 — `location-picker.component.ts` (homepage)

- Split UI state into two signals (`status: 'idle' | 'loading' | 'error' | 'success'` and `result: LocationResult | null`) instead of one discriminated-union signal — Angular's template type narrowing doesn't follow a signal read across an `@switch`, so a single `state()` call couldn't be safely narrowed inside `@case ('success')`. An `@if (result(); as result)` inside that case narrows cleanly instead.
- Chained the three async steps (GPS → nearest station → rain report) with `switchMap`, short-circuiting to `of(null)` when no station/report is found, and a single `catchError(() => of(null))` at the end — one `error`/`success` outcome for the whole chain instead of three separate error branches.
- Extended `RainVerdictComponent` with an optional `distanceKm = input<number | null>(null)` (only shown via `@if`) so the same presentational component serves both the city page (no distance) and the GPS flow (with distance), instead of forking a second verdict component.
- Homepage route (`path: ''`) is prerendered (falls through to the `'**'` `RenderMode.Prerender` rule in `app.routes.server.ts`, since `':citySlug'` doesn't match an empty path) — matches the plan decision that GPS lookup is client-side-only with no SEO value.
- Verified success and `permission-denied` paths live via the same `navigator.geolocation` mocking technique as step 19, clicking the real button in a running `ng serve` session.
- Removed the `ng new` placeholder markup from `app.html`/`app.ts` (and the now-unrelated `app.spec.ts` title assertion) — it was masking real route content the whole time, just below the fold.

## Step 22 — homepage manual station search

- Added a same-origin `/api/stations` Express route in `server.ts` (plain `fetch`, module-scoped TTL cache) so the browser never has to call `hydro-back.imgw.pl` directly — that call needs spoofed headers and would hit CORS/403 from a real browser context.
- `ImgwApiService.getStations()` now branches on `isPlatformBrowser`: server-side render still hits the real IMGW URL with headers (unchanged), browser-side hits `/api/stations` instead. `RainReportService` and `StationsService` needed zero changes — they only ever called `getStations()`, so the proxying is fully transparent to the rest of the app.
- `resource()` (not a manual subscription) drives the search box: `params: () => this.searchQuery()` re-runs the loader on every keystroke, but since `ImgwApiService`'s `shareReplay(1)` cache means only the _first_ keystroke triggers a real HTTP call — every later filter is synchronous over the cached list.
- Found and fixed a real bug via manual browser testing: naive `.toLowerCase().includes()` matching failed on diacritics (typing "Gdansk" didn't match "GDAŃSK"). Fixed with `String.prototype.normalize('NFD')` + stripping the `\p{Diacritic}` Unicode property before comparing, applied to both the query and station names in `StationsService.searchByName`.

## Step 23 — error/loading states

- Replaced the single generic `'error'` status with a separate `errorKind` signal (`'gps-denied' | 'gps-unavailable' | 'network' | 'no-data'`) plus a `computed()` message lookup — `status` still drives which template branch renders, `errorKind` only decides the wording within the error branch.
- Each RxJS stage in the GPS chain (`getCurrentPosition`, `findNearestStation`, `getRainReport`) gets its own `catchError` that sets the specific `errorKind` before falling back to `of(null)`/`of(coords)`, so a failure at any step reports accurately instead of collapsing into one generic message.
- `resource()`'s built-in `isLoading()`/`error()` signals cover the search box's own loading/error UI for free — no extra state needed there, unlike the manually-driven GPS flow.
- Verified live: mocking `GeolocationPositionError.code` 1 vs. 2 produces two distinct, correctly-worded messages in the browser (permission text vs. generic unavailable text).

## Step 24 — Vitest unit tests for pure logic

- `provideHttpClientTesting()` + `HttpTestingController` (Angular's standard HTTP testing setup) works unmodified under the CLI's Vitest builder — no Angular-specific test config needed beyond the usual `TestBed.configureTestingModule`.
- `vi.useFakeTimers()` + `vi.advanceTimersByTime()` (Vitest globals, no import needed) verified the TTL cache actually expires and re-fetches — this is the one test that wouldn't have caught a real regression the other 9 wouldn't (e.g. a `>=` vs `>` off-by-one in the `expiresAt` check).
- Added `formatLocalTime()` (`shared/utils/format-local-time.ts`) purely to give the plan's "UTC→local time conversion" test item something real to test — no UI consumes it yet, since nothing currently renders a timestamp. `Intl.DateTimeFormat` with `timeZone: 'Europe/Warsaw'` correctly resolves both CET (UTC+1, winter) and CEST (UTC+2, summer DST) without a date library.
- Exported `haversineDistanceKm` from `stations.service.ts` (previously module-private) purely so it's independently testable — asserted it reproduces the real-world Warszawa↔Kraków distance (~252 km) rather than just checking internal consistency.

## Step 25 — verifying v1 on Vercel production (two real deployment bugs found)

- **Bug 1 — SSR never ran on Vercel.** Angular always emits a static `index.html` shell alongside the SSR server bundle; Vercel's zero-config Angular integration lets its filesystem router match that static file for _every_ path before any function/rewrite rule fires (upstream issue: angular/angular-cli#30736). Confirmed via `vercel build` locally — the generated `.vercel/output` had no `functions/` directory at all, just `static/`. Fixed with `api/index.mjs` (imports the `reqHandler` already exported by `src/server.ts`) plus `vercel.json` (`rewrites` forcing all requests through it, `includeFiles` bundling the compiled `dist/czypadalo/**` into the function so `server.mjs`'s relative `../browser` lookup still resolves).
- **Bug 2 — Angular's own SSRF guard blocked the fixed SSR path.** Once requests actually reached `server.mjs`, Angular's built-in host-header validation (`security.allowedHosts` in `angular.json`) rejected them, since the option defaults to an empty array (deny-all) rather than "unrestricted". Needed the actual production hostnames listed explicitly; a `*.subdomain` prefix is supported for wildcard matching (used for the team's per-deployment preview URLs).
- Verification method: used `vercel build --yes` + inspecting `.vercel/output/config.json`/`functions/` locally to diagnose _before_ pushing, then `vercel deploy --prebuilt` to a preview URL as a fast (if SSO-gated) sanity check, then the real git-push → auto-deploy → `curl` against the public `czy-padalo.vercel.app` alias as the final confirmation — preview deployment URLs are protected by Vercel SSO by default and can't be curled directly.
- Take-away: **passing `ng build` + `ng serve` locally does not guarantee a working deployment** on a platform-specific zero-config integration — the only real verification is hitting the actual deployed URL.
