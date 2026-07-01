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
