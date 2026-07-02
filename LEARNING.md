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

## Step 26 — "Kindle paper" design tokens

- Dark mode is pure CSS: the same custom properties are redefined inside `@media (prefers-color-scheme: dark) { :root { ... } }` — no JS, no class toggling, no persisted state, matching the v2 decision to follow the OS setting only.
- Chose a system serif font stack (`Georgia, 'Iowan Old Style', ...`) over loading a webfont (e.g. Literata) — avoids a render-blocking/FOUT-prone external font request for an MVP, at the cost of not matching Kindle's actual Bookerly typeface exactly.
- Verified contrast ratios with a small script (WCAG relative-luminance formula) before ever opening a browser — all four ink/muted/accent-on-background pairs, both themes, land at 6.2:1 or higher (AA requires 4.5:1 for body text).
- Verified visually in a live `ng serve` session: dark mode rendered correctly from the OS preference automatically; light mode was checked by injecting a temporary `!important` override stylesheet via devtools (can't toggle the actual OS color scheme from browser automation).

## Steps 27–28 — centered layout, `rain-verdict` restyle

- Centered column is a single wrapper `<div class="page">` around `<router-outlet />` in `app.html`, styled with `max-width: var(--content-max-width); margin-inline: auto;` in `app.scss` — one place controls the reading width for every route, no per-page layout duplication.
- Found a real regression by testing the _default_ (non-"rain") verdict state in dark mode, not just the accent-colored one: `rain-verdict.component.scss` had hardcoded light-mode colors (`#1a1a1a` text, `#333`, `#555`) left over from before the design tokens existed, making the "Nie padało" label nearly invisible on the new dark background. Screenshotting only the "Padało" (accent-colored, still legible by coincidence) state would have missed this — always check every visual state, not just the first one that renders.
- Tried a bordered "card" treatment around the verdict first (`border` + `border-radius`); reverted after user feedback that it looked out of place — plain typography on the page background reads more like the intended e-ink page than a boxed UI card.

## Step 29 — `location-picker.component` restyle

- Added explicit BEM-ish classes (`location-picker__gps-button`, `location-picker__result`) to elements that previously relied on bare tag selectors (`button`, `input`) — needed so the GPS button (bordered, button-like) and the search-result buttons (plain underlined links) could get deliberately different treatments despite both being `<button>` elements.
- Search results styled as text links (`color: var(--color-accent)`, underline only on hover/`:focus`) rather than boxed list items — reads more like tappable text in a document than a UI widget, consistent with the e-ink direction.
- Input uses a bottom-border-only style (no full box) that switches to `var(--color-accent)` on focus — kept the browser's native focus-visible behavior rather than a custom outline, for accessibility.

## Step 30 — `precip-icon` component (and a real data bug it surfaced)

- Initially mapped `Station.statusCode` directly to an icon variant, per the original plan. Manual testing against real data (Gdynia) caught that this was wrong: `statusCode` reflects near-real-time precipitation state, not the same 24h window `precip24HoursSum` (and thus our verdict text) covers — a station can be `"no-precip"` right now while still having rained 0.8mm over the last 24h. Showing the icon and text from two different data windows meant they could visibly contradict each other.
- Fixed by deriving the icon purely from the same `mm`/`hasData` values already driving `verdictText` (`toPrecipIconVariant(mm, hasData)`, plain mm threshold at 10mm for light vs. heavy) — icon and text now structurally can't disagree, since they're computed from the same source value in the same component.
- `RainReport.hasData` replaces the abandoned `statusCode` field — distinguishes "0mm, and we know that because we got a reading" from "we have no reading at all" (`precip24HoursSum === null`), which maps to a distinct "unknown" dashed-circle icon.
- `PrecipIconComponent` is `aria-hidden="true"` internally — it's purely decorative next to text that already states the verdict in words, so it shouldn't be double-announced by screen readers. Added a plain `title` attribute (via `host: { '[attr.title]': ... }`) for a hover tooltip, not for a11y purposes.
- Verified all three real-data states live (not just "does it compile"): Gdynia 0.8mm → light single drop, Łódź 0mm → empty circle, Chałupki 39.7mm → heavy double drop.

## Step 31 — precipitation breakdown fields

- `precip6HoursSum`/`precip12HoursSum` exist in the real `/list/meteo` response (confirmed in PLAN.md's original sample) but were never added to the `Station` model in v1 since nothing used them — added now alongside the existing `precip24HoursSum`/`lastHourPrecip`/`dailyPrecip` fields, same `PrecipRangeSum | null` shape.
- `RainReportService` maps each nullable field with the same `?? 0` fallback already used for the 24h `mm`, kept consistent rather than introducing a different null-handling convention per field.
- Verified against live data (Gdynia) that all four new values are populated and distinct (lastHour 0mm, daily 0.8mm, 6h 0mm, 12h 0.1mm, 24h 0.8mm) — confirms these really are different time windows, not duplicates of the same number.

## Step 32 — precipitation breakdown display

- Rendered as a `<dl>` of `dt`/`dd` rows below a `border-top` separator — plain semantic markup rather than a table or grid, consistent with the e-ink "reading a page" feel rather than a dashboard widget.
- Labeling `dailyMm` needed care: it's the IMGW "opad dobowy" (calendar-day sum, 06:00 UTC to 06:00 UTC), not a rolling 24h window — the rolling 24h figure is the `mm`/`precip24HoursSum` value already shown as the main verdict number above. Calling this row "Ostatnie 24h" would have made it look like a duplicate of the main figure despite holding a different value. Landed on "Ostatnia doba" per user preference, understanding it refers to that same fixed calendar-day window.
- Rows are ordered shortest-to-longest window (godzina → 6h → 12h → doba) per user feedback — reads more naturally than the order the fields happened to be added to the model.

## Steps 33–34 — `precip-history.component`

- Verified the plan's noted risk before building anything: `GET /station/meteo/data?id=<code>&hoursInterval=24` really does return 24 distinct hourly `precip` entries (checked via a direct `curl` against the real API) — confirms the endpoint works as assumed, so the v1-era open question in PLAN.md's Risks section is resolved.
- `resource()` with `params: () => this.stationCode()` fetches eagerly regardless of whether the `<details>` is expanded — only the _display_ is deferred behind the disclosure, not the network request. Fine here since `ImgwApiService.getStationHistory` is already `shareReplay`-cached, so this doesn't cost an extra real request when the city page also happens to load it.
- Used the native `<details>`/`<summary>` element for the collapsible section instead of a signal-driven `@if` + button — free keyboard/accessibility support (Enter/Space toggle, correct ARIA semantics) with zero component state. The expand/collapse chevron is pure CSS (`content: '▾'` rotated via the `[open]` attribute selector), no extra markup or JS needed.
- `PrecipHistoryComponent` is used identically in both `city-page.component` (fed by the resolved `report().stationCode`) and `location-picker.component` (fed by `result.report.stationCode` in the GPS/search success branch) — same component, no duplication, despite the two host components having very different data-loading strategies (SSR resolver vs. client-side RxJS chain).

## Step 35 — accessibility verification (two real bugs found)

- **Search results relied on color alone.** `.location-picker__result` only showed its underline `:hover`, meaning by default a link was distinguished from surrounding text purely by its accent color — a WCAG 1.4.1 (Use of Color) violation for users who can't perceive that color difference. Fixed by making the underline permanent, matching how links normally look in running text.
- **The search input suppressed focus entirely.** `input:focus { outline: none; border-color: var(--color-accent); }` removed the native focus ring and replaced it with only a 1px border-color change — too subtle to reliably satisfy WCAG 2.4.7 (Focus Visible). Switched to `:focus-visible` with an explicit `outline: 2px solid var(--color-accent); outline-offset: 4px;`, verified via `getComputedStyle` after a scripted `.focus()` call (Tab-key simulation through browser automation doesn't reliably trigger `:focus-visible` the way real keyboard input does).
- Contrast ratios were already verified analytically in step 26 (6.2:1+ for every ink/muted/accent pair, both themes) and didn't need re-checking — this step's value was in catching _interaction_ accessibility issues that a static contrast check can't surface.
- Also fixed two unrelated visual nits caught during this pass: `precip-history`'s width/border didn't match `verdict__breakdown`'s (now both `max-width: 20rem` + centered), and hourly history read oldest-to-newest instead of newest-first (now `[...precip].reverse()` via a computed signal).
- A separate real bug surfaced later by manual production testing: `app-rain-verdict`/`app-precip-history` shrink-wrapped to content width instead of filling available space when used as flex items inside `location-picker`'s `align-items: center` column (flex items default to shrink-to-fit unless stretched), while on city pages the same components sit in a plain block container and fill it naturally. Fixed with a targeted `align-self: stretch` on those two tag selectors within `.location-picker`, rather than changing the shared component's own CSS (which would have refit the assumption cross-context).

## Step 36 — custom favicon

- `public/favicon.svg` reuses the exact same raindrop `<path>` as `precip-icon`'s "light" variant, with a `<style>` block inside the SVG itself doing `@media (prefers-color-scheme: dark)` — favicons can be theme-aware with zero JS, browsers apply the OS preference to the embedded stylesheet same as any other SVG.
- `index.html` lists `rel="icon" type="image/svg+xml"` first and `rel="alternate icon" type="image/x-icon"` second — modern browsers use the SVG, older ones fall back to the `.ico`. Regenerated `favicon.ico` from the SVG (`rsvg-convert` → PNGs at 16/32/64/256px → Pillow multi-resolution `.ico`) instead of leaving Angular's default logo in place as the fallback, so even legacy browsers get the real brand icon.

## Step 37 — per-city Open Graph images

- New Express route `/api/og/:citySlug` in `server.ts` renders a real PNG using `satori` (lays out a React-element-shaped tree into SVG, flexbox-only layout model) piped into `@resvg/resvg-js` (SVG→PNG). Result is cached in-memory for 10 minutes, same pattern as the `/api/stations` proxy.
- `satori` needs actual font _binary_ data — it can't use system/CSS font names. Downloaded PT Serif (SIL OFL-licensed, matches the app's serif design direction) directly from the real Google Fonts CDN (`fonts.googleapis.com/css2?family=...` → parse the `src: url(...)` → `curl` the two `.ttf` files) rather than guessing a URL or using a placeholder — legitimate, redistributable font files checked into `public/fonts/`.
- Fonts live in `public/fonts/` (not `src/assets/`) specifically so Angular's existing asset pipeline (`assets: [{ glob: '**/*', input: 'public' }]`) copies them into `dist/czypadalo/browser/fonts/` automatically — `server.ts` reads them via the same `browserDistFolder` path it already uses for `express.static`, and the existing `vercel.json` `includeFiles: "dist/czypadalo/**"` already bundles them into the deployed function with zero extra config.
- Hit two real build errors before it worked:
  1. `@resvg/resvg-js` ships native `.node` binary addons that esbuild can't bundle ("No loader is configured for '.node' files") — fixed with `externalDependencies: ["@resvg/resvg-js"]` in `angular.json`'s build options (leaves it as a real `require()`, resolved from `node_modules` at runtime instead of bundled).
  2. Reading the font files at module top-level (`readFileSync` outside any function) crashed Angular's build-time route-extraction step, which imports `server.ts` from a temporary staging directory that doesn't have `browser/fonts` yet. Fixed by making the read lazy (a memoized `getOgFonts()` function called only inside the request handler) — a general lesson: anything in `server.ts` that touches the real filesystem layout must not run at import time, since the module gets imported in contexts where that layout doesn't exist yet.
- `city-page.component`'s `og:image`/`twitter:image` need an _absolute_ URL (crawlers fetch them standalone, no page context to resolve a relative URL against). Used Angular v22's `REQUEST` injection token (`inject(REQUEST, { optional: true })`) to get the real incoming request during SSR, falling back to `window.location.origin` when running client-side (post-hydration re-run of the same `effect()`) — avoids hardcoding a production domain that would be wrong on preview deployments or `localhost`.
- Verified by running the actual compiled `dist/czypadalo/server/server.mjs` directly (not `ng serve`, whose dev-server root doesn't mirror the real `browser/` output folder) and using the `Read` tool to view the generated PNGs directly — confirmed real Polish diacritics, correct accent/ink colors per verdict state, and working end-to-end through the `Host` header the same way production traffic arrives.
- `ng serve` hit the same missing-`browser/fonts` problem live (reported after the fact) — fixed properly rather than leaving it as a known dev-only limitation: `getOgFonts()` now checks `existsSync` on the dist path first (correct for the real production build) and falls back to `join(process.cwd(), 'public/fonts')` otherwise, which resolves correctly under `ng serve` since its process cwd is the project root.
