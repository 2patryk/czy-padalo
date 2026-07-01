import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import {
  IMGW_HEADERS,
  STATIONS_CACHE_TTL_MS,
  STATIONS_URL,
} from './app/core/services/imgw-api.service';
import { Station } from './app/core/models/station.model';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Same-origin proxy for the station list, so the browser (homepage station
 * search) never has to call hydro-back.imgw.pl directly — see PLAN.md
 * gotchas on required headers and CORS.
 */
let stationsCache: { data: Station[]; expiresAt: number } | null = null;

app.get('/api/stations', async (req, res) => {
  const now = Date.now();
  if (stationsCache && stationsCache.expiresAt > now) {
    res.json(stationsCache.data);
    return;
  }

  try {
    const headers: Record<string, string> = {};
    IMGW_HEADERS.keys().forEach((key) => {
      headers[key] = IMGW_HEADERS.get(key) ?? '';
    });

    const response = await fetch(STATIONS_URL, { headers });
    if (!response.ok) {
      res.status(response.status).end();
      return;
    }

    const data = (await response.json()) as Station[];
    stationsCache = { data, expiresAt: now + STATIONS_CACHE_TTL_MS };
    res.json(data);
  } catch {
    res.status(502).end();
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
