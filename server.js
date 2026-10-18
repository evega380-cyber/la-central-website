
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const APP_ID = process.env.PLANNING_CENTER_APP_ID;
const SECRET = process.env.PLANNING_CENTER_SECRET;

const PCO_BASE = "https://api.planningcenteronline.com";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });

  res.end(JSON.stringify(body));
}

async function pcoFetch(endpoint) {
  if (!APP_ID || !SECRET) {
    throw new Error("Planning Center credentials missing");
  }

  const auth = Buffer.from(
    `${APP_ID}:${SECRET}`
  ).toString("base64");

  const response = await fetch(
    `${PCO_BASE}${endpoint}`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(15000)
    }
  );

  if (!response.ok) {
    const error = new Error(
      `Planning Center returned HTTP ${response.status}`
    );

    error.status = response.status;
    throw error;
  }

  return response.json();
}

function mapRegistration(item) {
  const a = item.attributes || {};

  return {
    id: item.id,
    name: a.name || "",
    description: a.description || "",
    image: a.logo_url || null,
    registrationUrl: a.new_registration_url || null,
    open: a.open === true,
    closed: a.closed === true,
    archived: a.archived === true,
    openAt: a.open_at || null,
    closeAt: a.close_at || null
  };
}

function authorizedAdmin(req) {
  const configured = process.env.LA_CENTRAL_ADMIN_API_KEY;
  if (!configured || configured.length < 32) return false;
  const supplied = req.headers["x-la-central-admin-key"];
  if (typeof supplied !== "string") return false;
  const crypto = require("crypto");
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual);
}

async function api(req, res, url) {
  // Diagnostics must never be exposed to anonymous website visitors.
  if (url.pathname.startsWith("/api/planning-center/") &&
      !authorizedAdmin(req)) {
    return json(res, 404, { error: "Not found" });
  }


if (url.pathname === "/api/website-registrations") {
  try {
    const WEBSITE_CATEGORY_ID = "111364";
    const featured = [];
    let nextPath = "/registrations/v2/signups?per_page=100";
    let pagesChecked = 0;

    while (nextPath && pagesChecked < 20) {
      const payload = await pcoFetch(nextPath);
      pagesChecked++;

      const signups = payload.data || [];

      for (const signup of signups) {
        const a = signup.attributes || {};

        if (a.archived || a.closed || !a.open) continue;

        const categories = await pcoFetch(
          `/registrations/v2/signups/${signup.id}/categories`
        );

        const onWebsite = (categories.data || []).some(
          category => String(category.id) === WEBSITE_CATEGORY_ID
        );

        if (!onWebsite) continue;

        featured.push({
          id: signup.id,
          title: a.name,
          description: a.description || "",
          image: a.logo_url || null,
          url: a.new_registration_url ||
            `https://iddpmi093.churchcenter.com/registrations/events/${signup.id}`
        });
      }

      const nextUrl = payload.links?.next;
      if (nextUrl) {
        const parsed = new URL(nextUrl);
        nextPath = parsed.pathname + parsed.search;
      } else {
        nextPath = null;
      }
    }

    return json(res, 200, {
      registrations: featured.slice(0, 3)
    });

  } catch (error) {
    console.error("Website registrations:", error.message);
    return json(res, 502, {
      error: "Unable to load website registrations"
    });
  }
}

if (url.pathname === "/api/planning-center/website-category-test") {
  try {
    const payload = await pcoFetch(
      "/registrations/v2/signups/3946980/categories"
    );

    const categories = (payload.data || []).map(item => ({
      id: item.id,
      name: item.attributes?.name || "",
      type: item.type
    }));

    return json(res, 200, {
      registrationId: "3946980",
      categories,
      isWebsiteFeatured: categories.some(
        category =>
          category.name.trim().toLowerCase() === "website"
      )
    });

  } catch (error) {
    console.error("Website category test:", error.message);

    return json(res, 502, {
      error: "Unable to retrieve registration categories",
      status: error.status || null
    });
  }
}

  // SERVER HEALTH

  if (url.pathname === "/api/health") {
    return json(res, 200, {
      ok: true,
      service: "La Central Website"
    });
  }

  // PLANNING CENTER CONNECTION STATUS

  if (
    url.pathname ===
    "/api/planning-center/status"
  ) {
    try {
      await pcoFetch(
        "/calendar/v2/calendars?per_page=1"
      );

      return json(res, 200, {
        connected: true,
        service: "Planning Center Calendar"
      });

    } catch (error) {
      console.error(
        "Planning Center status:",
        error.message
      );

      return json(res, 502, {
        connected: false,
        error: "Planning Center unavailable"
      });
    }
  }

  // UPCOMING CALENDAR EVENTS

  if (url.pathname === "/api/events") {
    try {
      const payload = await pcoFetch(
        "/calendar/v2/event_instances" +
        "?filter=future" +
        "&order=starts_at" +
        "&per_page=12" +
        "&fields[event_instance]=" +
        "name,starts_at,ends_at,location," +
        "church_center_url,image_url,description"
      );

      const events = (payload.data || [])
        .slice(0, 6)
        .map(item => {
          const a = item.attributes || {};

          return {
            id: item.id,
            name: a.name || "",
            startsAt: a.starts_at || null,
            endsAt: a.ends_at || null,
            location: a.location || "",
            description: a.description || "",
            image: a.image_url || null,
            url: a.church_center_url || null
          };
        });

      return json(res, 200, { events });

    } catch (error) {
      console.error(
        "Calendar events:",
        error.message
      );

      return json(res, 502, {
        events: [],
        error: "Unable to load events"
      });
    }
  }

  // FEATURED CALENDAR EVENTS
  // Existing endpoint retained for compatibility.

  if (
    url.pathname === "/api/featured-events"
  ) {
    try {
      const payload = await pcoFetch(
        "/calendar/v2/event_instances" +
        "?filter=future" +
        "&order=starts_at" +
        "&per_page=100" +
        "&include=event"
      );

      const included = payload.included || [];

      const featuredIds = new Set(
        included
          .filter(item =>
            item.type === "Event" &&
            item.attributes?.featured === true &&
            item.attributes?.visible_in_church_center === true
          )
          .map(item => String(item.id))
      );

      const events = (payload.data || [])
        .filter(item => {
          const eventId =
            item.relationships?.event?.data?.id;

          return featuredIds.has(
            String(eventId)
          );
        })
        .slice(0, 3)
        .map(item => {
          const a = item.attributes || {};

          return {
            id: item.id,
            name: a.name || "",
            startsAt: a.starts_at || null,
            endsAt: a.ends_at || null,
            location: a.location || "",
            image: a.image_url || null,
            url: a.church_center_url || null
          };
        });

      return json(res, 200, { events });

    } catch (error) {
      console.error(
        "Featured events:",
        error.message
      );

      return json(res, 502, {
        events: [],
        error: "Unable to load featured events"
      });
    }
  }

  // REGISTRATIONS CONNECTION TEST

  if (
    url.pathname ===
    "/api/planning-center/registrations-test"
  ) {
    try {
      const payload = await pcoFetch(
        "/registrations/v2/signups?per_page=5"
      );

      const signups = (payload.data || [])
        .map(item => ({
          id: item.id,
          name: item.attributes?.name || "",
          attributes: Object.keys(
            item.attributes || {}
          )
        }));

      return json(res, 200, {
        connected: true,
        service: "Planning Center Registrations",
        signups
      });

    } catch (error) {
      console.error(
        "Registrations test:",
        error.message
      );

      return json(res, 502, {
        connected: false,
        error: "Registrations unavailable"
      });
    }
  }

  // REGISTRATION CATEGORY TEST
  // Specific registration ID: 3946980

  if (
    url.pathname ===
    "/api/planning-center/category-test"
  ) {
    try {
      const payload = await pcoFetch(
        "/registrations/v2/signups/3946980"
      );

      const signup = payload.data || {};

      return json(res, 200, {
        id: signup.id,
        name: signup.attributes?.name || "",
        open: signup.attributes?.open,
        closed: signup.attributes?.closed,
        archived: signup.attributes?.archived,
        attributes: Object.keys(
          signup.attributes || {}
        ),
        relationships: signup.relationships || {},
        links: signup.links || {},
        included: (payload.included || [])
          .map(item => ({
            type: item.type,
            id: item.id,
            name: item.attributes?.name
          }))
      });

    } catch (error) {
      console.error(
        "Category test:",
        error.message
      );

      return json(res, 502, {
        error: "Unable to inspect category",
        status: error.status || null
      });
    }
  }

  // RECENT REGISTRATIONS TEST

  if (
    url.pathname ===
    "/api/planning-center/featured-test"
  ) {
    try {
      const payload = await pcoFetch(
        "/registrations/v2/signups?per_page=100"
      );

      const signups = (payload.data || [])
        .map(item => ({
          id: item.id,
          name: item.attributes?.name,
          open: item.attributes?.open,
          closed: item.attributes?.closed,
          archived: item.attributes?.archived,
          availableFields: Object.keys(
            item.attributes || {}
          ),
          relationships: Object.keys(
            item.relationships || {}
          )
        }));

      return json(res, 200, {
        totalReturned: signups.length,
        signups
      });

    } catch (error) {
      console.error(
        "Featured test:",
        error.message
      );

      return json(res, 502, {
        error: "Unable to inspect registrations"
      });
    }
  }

  // OPEN REGISTRATIONS
  // Retrieves pages until enough open signups are found.

  if (url.pathname === "/api/registrations") {
    try {
      const registrations = [];
      let endpoint =
        "/registrations/v2/signups?per_page=100";

      let page = 0;

      while (
        endpoint &&
        page < 10 &&
        registrations.length < 12
      ) {
        const payload = await pcoFetch(endpoint);

        for (const item of payload.data || []) {
          const registration =
            mapRegistration(item);

          if (
            registration.open &&
            !registration.closed &&
            !registration.archived
          ) {
            registrations.push(registration);
          }
        }

        const next = payload.links?.next;

        if (next) {
          const nextUrl = new URL(
            next,
            PCO_BASE
          );

          if (
            nextUrl.origin !== PCO_BASE ||
            !nextUrl.pathname.startsWith(
              "/registrations/v2/"
            )
          ) {
            endpoint = null;
          } else {
            endpoint =
              nextUrl.pathname +
              nextUrl.search;
          }
        } else {
          endpoint = null;
        }

        page++;
      }

      return json(res, 200, {
        registrations:
          registrations.slice(0, 12)
      });

    } catch (error) {
      console.error(
        "Registrations:",
        error.message
      );

      return json(res, 502, {
        registrations: [],
        error: "Unable to load registrations"
      });
    }
  }

  return json(res, 404, {
    error: "API endpoint not found"
  });
}

// STATIC WEBSITE FILES

function serveStatic(req, res, url) {
  let pathname;

  try {
    pathname = decodeURIComponent(
      url.pathname
    );
  } catch {
    return json(res, 400, {
      error: "Invalid URL"
    });
  }

  if (pathname.includes("\0")) {
    return json(res, 400, {
      error: "Invalid path"
    });
  }

  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  const filePath = path.resolve(
    ROOT,
    "." + pathname
  );

  const relative = path.relative(
    ROOT,
    filePath
  );

  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    return json(res, 403, {
      error: "Forbidden"
    });
  }

  const parts = relative.split(path.sep);

  if (
    parts.some(part => part.startsWith(".")) ||
    parts.includes("node_modules") ||
    parts.includes(".git") ||
    parts.includes("server.js") ||
    parts.includes("package.json") ||
    parts.includes("package-lock.json")
  ) {
    return json(res, 403, {
      error: "Forbidden"
    });
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      return json(res, 404, {
        error: "Page not found"
      });
    }

    const ext = path.extname(
      filePath
    ).toLowerCase();

    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const headers = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes"
    };

    // Safari on iPad/iPhone requests video in byte ranges.
    // Without 206 Partial Content, MP4 playback may fail.
    const range = req.headers.range;
    if (range && /^bytes=\\d*-\\d*$/.test(range)) {
      const match = /^bytes=(\\d*)-(\\d*)$/.exec(range);
      const startText = match[1];
      const endText = match[2];
      let start;
      let end;

      if (!startText && !endText) {
        res.writeHead(416, { ...headers, "Content-Range": `bytes */${stats.size}` });
        return res.end();
      }

      if (!startText) {
        const suffix = Number(endText);
        start = Math.max(0, stats.size - suffix);
        end = stats.size - 1;
      } else {
        start = Number(startText);
        end = endText ? Number(endText) : stats.size - 1;
      }

      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
          start >= stats.size || start > end || start < 0) {
        res.writeHead(416, { ...headers, "Content-Range": `bytes */${stats.size}` });
        return res.end();
      }

      end = Math.min(end, stats.size - 1);
      res.writeHead(206, {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Content-Length": end - start + 1
      });

      if (req.method === "HEAD") return res.end();

      const stream = fs.createReadStream(filePath, { start, end });
      stream.on("error", () => res.destroy());
      return stream.pipe(res);
    }

    res.writeHead(200, { ...headers, "Content-Length": stats.size });

    if (req.method === "HEAD") return res.end();

    const stream = fs.createReadStream(filePath);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  });
}

// MAIN SERVER

const server = http.createServer(
  async (req, res) => {
    try {
      const url = new URL(
        req.url,
        `http://${req.headers.host || "localhost"}`
      );

      if (
        req.method !== "GET" &&
        req.method !== "HEAD"
      ) {
        return json(res, 405, {
          error: "Method not allowed"
        });
      }

      if (url.pathname.startsWith("/api/")) {
        return await api(req, res, url);
      }

      return serveStatic(req, res, url);

    } catch (error) {
      console.error(
        "Server error:",
        error.message
      );

      if (!res.headersSent) {
        return json(res, 500, {
          error: "Internal server error"
        });
      }

      res.destroy();
    }
  }
);

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `La Central Website running on port ${PORT}`
  );
});
