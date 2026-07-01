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
