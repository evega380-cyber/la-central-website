const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

test("Planning Center diagnostic routes require admin authentication", () => {
  assert.match(source, /url\.pathname\.startsWith\("\/api\/planning-center\/"\)/);
  assert.match(source, /!authorizedAdmin\(req\)/);
});

test("Public registration and calendar endpoints remain present", () => {
  for (const endpoint of ["/api/events", "/api/featured-events", "/api/registrations", "/api/website-registrations"]) {
    assert.ok(source.includes(endpoint), endpoint);
  }
});

test("Admin key is read from server environment", () => {
  assert.match(source, /process\.env\.LA_CENTRAL_ADMIN_API_KEY/);
  assert.match(source, /timingSafeEqual/);
});
