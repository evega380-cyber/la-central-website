const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PCO_BASE = 'https://api.planningcenteronline.com';
const APP_ID = process.env.PLANNING_CENTER_APP_ID;
const SECRET = process.env.PLANNING_CENTER_SECRET;
const USER_AGENT = 'Central Goldenrod Website (https://la-central-website-production.up.railway.app/)';

function json(res, status, body) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}

async function pcoFetch(endpoint) {
  if (!APP_ID || !SECRET) throw new Error('Planning Center environment variables are not configured.');
  const auth = Buffer.from(`${APP_ID}:${SECRET}`).toString('base64');
  const response = await fetch(`${PCO_BASE}${endpoint}`, {
    headers: { 'Authorization': `Basic ${auth}`, 'User-Agent': USER_AGENT, 'Accept':'application/json' }
  });
  if (!response.ok) {
    const err = new Error(`Planning Center returned ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

async function api(req, res, url) {
  
  if (url.pathname === '/api/planning-center/featured-test') {
    try {
      const payload = await pcoFetch(
        '/registrations/v2/signups?per_page=100'
      );

      const signups = (payload.data || []).map(item => {
        const a = item.attributes || {};

        return {
          id: item.id,
          name: a.name,
          open: a.open,
          closed: a.closed,
          archived: a.archived,
          openAt: a.open_at,
          closeAt: a.close_at,
          availableFields: Object.keys(a),
          relationships: Object.keys(item.relationships || {})
        };
      });

      return json(res, 200, {
        totalReturned: signups.length,
        signups
      });

    } catch (e) {
      console.error('Featured test error:', e.message);

      return json(res, 502, {
        error: 'Unable to inspect registration fields'
      });
    }
  }

  
  if (url.pathname === '/api/planning-center/registrations-test') {
    try {
      const payload = await pcoFetch(
        '/registrations/v2/signups?per_page=5'
      );

      const signups = (payload.data || []).map(item => ({
        id: item.id,
        name: item.attributes?.name || '',
        attributes: Object.keys(item.attributes || {})
      }));

      return json(res, 200, {
        connected: true,
        service: 'Planning Center Registrations',
        signups
      });

    } catch (e) {
      console.error('Registrations test error:', e.message);

      return json(res, 502, {
        connected: false,
        error: `Registrations API returned ${e.status || 'an error'}`
      });
    }
  }

  if (url.pathname === '/api/planning-center/status') {
    try {
      await pcoFetch('/calendar/v2/calendars?per_page=1');
      return json(res, 200, { connected: true, service: 'Planning Center Calendar' });
    } catch (e) {
      console.error('PCO status error:', e.message);
      return json(res, 502, { connected: false, error: e.status === 401 ? 'Authentication failed' : 'Planning Center connection unavailable' });
    }
  }

  if (url.pathname === '/api/events') {
    try {
      const payload = await pcoFetch('/calendar/v2/event_instances?filter=future&order=starts_at&per_page=12&fields[event_instance]=name,starts_at,ends_at,location,church_center_url,image_url,description');
      const now = Date.now();
      const events = (payload.data || [])
        .map(item => {
          const a = item.attributes || {};
          return {
            id: item.id,
            name: a.name || 'Evento',
            startsAt: a.starts_at || a.published_starts_at || null,
            endsAt: a.ends_at || a.published_ends_at || null,
            location: a.location || '',
            url: a.church_center_url || 'https://iddpmi093.churchcenter.com/home',
            image: a.image_url || '',
            description: typeof a.description === 'string' ? a.description.replace(/<[^>]*>/g, '').trim().slice(0, 220) : ''
          };
        })
        .filter(e => !e.startsAt || new Date(e.startsAt).getTime() >= now - 86400000)
        .slice(0, 6);
      res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=300'});
      return res.end(JSON.stringify({ events }));
    } catch (e) {
      console.error('PCO events error:', e.message);
      return json(res, 502, { events: [], error: e.status === 401 ? 'Authentication failed' : 'Events are temporarily unavailable' });
    }
  }
  
  if (url.pathname === '/api/featured-events') {
    try {
      const payload = await pcoFetch(
        '/calendar/v2/event_instances?filter=future&order=starts_at&per_page=100&include=event'
      );

      const featuredEvents = new Map(
        (payload.included || [])
          .filter(item =>
            item.type === 'Event' &&
            item.attributes?.featured === true &&
            item.attributes?.visible_in_church_center === true
          )
          .map(item => [String(item.id), item])
      );

      const now = Date.now();

      const events = (payload.data || [])
        .filter(instance => {
          const eventId =
            instance.relationships?.event?.data?.id;

          return featuredEvents.has(String(eventId));
        })
        .map(instance => {
          const a = instance.attributes || {};
          const eventId =
            instance.relationships?.event?.data?.id;
          const event = featuredEvents.get(String(eventId));
          const details = event?.attributes || {};

          return {
            id: instance.id,
            name: a.name || details.name || 'Evento',
            startsAt: a.published_starts_at || a.starts_at,
            endsAt: a.published_ends_at || a.ends_at,
            location: a.location || '',
            url: a.church_center_url ||
              'https://iddpmi093.churchcenter.com/calendar',
            image: a.image_url || details.image_url || '',
            description: details.summary || ''
          };
        })
        .filter(event =>
          event.startsAt &&
          new Date(event.startsAt).getTime() >= now
        )
        .sort((a, b) =>
          new Date(a.startsAt) - new Date(b.startsAt)
        )
        .slice(0, 3);

      return json(res, 200, { events });

    } catch (e) {
      console.error('Featured events error:', e.message);

      return json(res, 502, {
        events: [],
        error: 'Featured events temporarily unavailable'
      });
    }
  }

  return json(res, 404, {error:'Not found'});
}

const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp4':'video/mp4','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return api(req,res,url);
  let pathname = url.pathname;

if (pathname === '/raices' || pathname === '/raices/') {
  pathname = '/raices/index.html';
}

let rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404, {'Content-Type':'text/plain'}); return res.end('Not found'); }
    res.writeHead(200, {'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(PORT, '0.0.0.0', () => console.log(`La Central V5 listening on ${PORT}`));
