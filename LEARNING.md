# Learning notes

Brief notes on Angular patterns used in this project, added as steps are completed.

## Step 1 — `ng new czypadalo --ssr --style=scss`

- Standalone bootstrap: `src/main.ts` calls `bootstrapApplication`, no `AppModule`.
- SSR scaffolding: `src/main.server.ts` + `src/server.ts` (Express-based request handler) + `app.config.server.ts` (server-only providers merged with `app.config.ts` via `mergeApplicationConfig`).
- `app.routes.server.ts` defines per-route rendering mode (defaults to `RenderMode.Prerender`) — will need `RenderMode.Server` for city pages once dynamic data is involved.
- Test runner: Vitest (CLI 22 default), spec file colocated as `app.spec.ts`.
