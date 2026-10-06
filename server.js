const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const PCO_BASE = 'https://api.planningcenteronline.com';
const APP_ID = process.env.PLANNING_CENTER_APP_ID;
const SECRET = process.env.PLANNING_CENTER_SECRET;

const USER_AGENT =
  'Central Goldenrod Website (https://la-central-website-production.up.railway.app/)';

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });

  res.end(JSON.stringify(body));
}

async function pcoFetch(endpoint) {
  if (!APP_ID || !SECRET) {
    throw new Error(
      'Planning Center environment variables are not configured.'
    );
  }

  const auth = Buffer.from(`${APP_ID}:${SECRET}`).toString('base64');

  const response = await fetch(`${PCO_BASE}${endpoint}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      'User-Agent': USER_AGENT,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const err = new Error(
      `Planning Center returned ${response.status}`
    );

    err.status = response.status;
    throw err;
  }

  return response.json();
}

async function api(req, res, url) {

  if (url.pathname === '/api/planning-center/status') {
    try {

      await pcoFetch(
        '/calendar/v2/calendars?per_page=1'
      );

      return json(res, 200, {
        connected: true,
        service: 'Planning Center Calendar'
      });

    } catch (e) {

      console.error(
        'PCO status error:',
        e.message
      );

      return json(res, 502, {
        connected: false,
        error:
          e.status === 401
            ? 'Authentication failed'
            : 'Planning Center connection unavailable'
      });
    }
  }


  if (url.pathname === '/api/events') {

    try {

      const payload = await pcoFetch(
        '/calendar/v2/event_instances?filter=future&order=starts_at&per_page=12&fields[event_instance]=name,starts_at,ends_at,location,church_center_url,image_url,description'
      );

      const now = Date.now();

      const events = (payload.data || [])

        .map(item => {

          const a = item.attributes || {};

          return {
            id: item.id,
            name: a.name || 'Evento',
            startsAt:
              a.starts_at ||
              a.published_starts_at ||
              null,

            endsAt:
              a.ends_at ||
              a.published_ends_at ||
              null,

            location: a.location || '',

            url:
              a.church_center_url ||
              'https://iddpmi093.churchcenter.com/home',

            image: a.image_url || '',

            description:
              typeof a.description === 'string'
                ? a.description
                    .replace(/<[^>]*>/g, '')
                    .trim()
                    .slice(0, 220)
                : ''
          };

        })

        .filter(
          e =>
            !e.startsAt ||
            new Date(e.startsAt).getTime() >=
              now - 86400000
        )

        .slice(0, 6);


      res.writeHead(200, {
        'Content-Type':
          'application/json; charset=utf-8',

        'Cache-Control':
          'public, max-age=300'
      });

      return res.end(
        JSON.stringify({ events })
      );

    } catch (e) {

      console.error(
        'PCO events error:',
        e.message
      );

      return json(res, 502, {
        events: [],
        error:
          e.status === 401
            ? 'Authentication failed'
            : 'Events are temporarily unavailable'
      });
    }
  }

  return json(res, 404, {
    error: 'Not found'
  });
}


const mime = {

  '.html':
    'text/html; charset=utf-8',

  '.css':
    'text/css; charset=utf-8',

  '.js':
    'text/javascript; charset=utf-8',

  '.png':
    'image/png',

  '.jpg':
    'image/jpeg',

  '.jpeg':
    'image/jpeg',

  '.mp4':
    'video/mp4',

  '.svg':
    'image/svg+xml',

  '.ico':
    'image/x-icon'
};


const server = http.createServer(
  async (req, res) => {

    const url = new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    );


    /* -------------------------
       API ROUTES
    -------------------------- */

    if (url.pathname.startsWith('/api/')) {
      return api(req, res, url);
    }


    /* -------------------------
       WEBSITE ROUTING
    -------------------------- */

    let pathname =
      decodeURIComponent(url.pathname);


    /*
      Homepage
    */

    if (pathname === '/') {
      pathname = '/index.html';
    }


    /*
      RAÍCES ROUTING FIX

      /raices
      /raices/

      both load:

      /raices/index.html
    */

    if (
      pathname === '/raices' ||
      pathname === '/raices/'
    ) {
      pathname =
        '/raices/index.html';
    }


    /*
      Build safe file path
    */

    const file = path.normalize(
      path.join(ROOT, pathname)
    );


    if (!file.startsWith(ROOT)) {

      res.writeHead(403);

      return res.end(
        'Forbidden'
      );
    }


    /*
      Serve requested file
    */

    fs.stat(
      file,
      (err, stat) => {

        if (
          err ||
          !stat.isFile()
        ) {

          res.writeHead(
            404,
            {
              'Content-Type':
                'text/plain; charset=utf-8'
            }
          );

          return res.end(
            'Not found'
          );
        }


        res.writeHead(
          200,
          {
            'Content-Type':
              mime[
                path
                  .extname(file)
                  .toLowerCase()
              ] ||
              'application/octet-stream'
          }
        );


        fs
          .createReadStream(file)
          .pipe(res);

      }
    );

  }
);


server.listen(
  PORT,
  '0.0.0.0',
  () =>
    console.log(
      `La Central V6 + Raíces listening on ${PORT}`
    )
);
