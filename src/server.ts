import { Resvg } from '@resvg/resvg-js';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { CITIES } from './app/core/data/cities';
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

async function getStations(): Promise<Station[] | null> {
  const now = Date.now();
  if (stationsCache && stationsCache.expiresAt > now) {
    return stationsCache.data;
  }

  try {
    const headers: Record<string, string> = {};
    IMGW_HEADERS.keys().forEach((key) => {
      headers[key] = IMGW_HEADERS.get(key) ?? '';
    });

    const response = await fetch(STATIONS_URL, { headers });
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Station[];
    stationsCache = { data, expiresAt: now + STATIONS_CACHE_TTL_MS };
    return data;
  } catch {
    return null;
  }
}

app.get('/api/stations', async (req, res) => {
  const data = await getStations();
  if (!data) {
    res.status(502).end();
    return;
  }

  res.json(data);
});

/**
 * Per-city Open Graph image for social sharing previews — see PLAN.md v2 step 37.
 */
const OG_IMAGE_CACHE_TTL_MS = 10 * 60 * 1000;
const ogImageCache = new Map<string, { data: Buffer; expiresAt: number }>();

/**
 * Lazily read, not at module scope: Angular's build-time route extraction (and
 * `ng serve`'s dev server) import this module from staging/virtual roots where
 * `browser/fonts` doesn't exist — fall back to the source `public/fonts` in that case.
 */
let ogFonts: { regular: Buffer; bold: Buffer } | null = null;
function getOgFonts(): { regular: Buffer; bold: Buffer } {
  if (!ogFonts) {
    const distFontsDir = join(browserDistFolder, 'fonts');
    const fontsDir = existsSync(distFontsDir) ? distFontsDir : join(process.cwd(), 'public/fonts');
    ogFonts = {
      regular: readFileSync(join(fontsDir, 'PTSerif-Regular.ttf')),
      bold: readFileSync(join(fontsDir, 'PTSerif-Bold.ttf')),
    };
  }
  return ogFonts;
}

app.get('/api/og/:citySlug', async (req, res) => {
  const { citySlug } = req.params;
  const now = Date.now();
  const cached = ogImageCache.get(citySlug);
  if (cached && cached.expiresAt > now) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(cached.data);
    return;
  }

  const city = CITIES.find((c) => c.slug === citySlug);
  if (!city) {
    res.status(404).end();
    return;
  }

  const stations = await getStations();
  const station = stations?.find((s) => s.code === city.stationCode);
  if (!station) {
    res.status(404).end();
    return;
  }

  const mm = station.precip24HoursSum?.value ?? 0;
  const didRain = mm > 0;
  const verdictText = didRain ? `Padało, ${mm.toFixed(1)} mm` : 'Nie padało';

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f4e9',
          fontFamily: 'PT Serif',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                fontSize: 96,
                fontWeight: 700,
                color: didRain ? '#33475b' : '#1a1a1a',
              },
              children: verdictText,
            },
          },
          {
            type: 'div',
            props: {
              style: { fontSize: 56, marginTop: 32, color: '#1a1a1a' },
              children: city.name,
            },
          },
          {
            type: 'div',
            props: {
              style: { fontSize: 32, marginTop: 16, color: '#5a5650' },
              children: station.name,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'PT Serif', data: getOgFonts().regular, weight: 400, style: 'normal' },
        { name: 'PT Serif', data: getOgFonts().bold, weight: 700, style: 'normal' },
      ],
    },
  );

  const png = new Resvg(svg).render().asPng();
  ogImageCache.set(citySlug, { data: png, expiresAt: now + OG_IMAGE_CACHE_TTL_MS });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.send(png);
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
