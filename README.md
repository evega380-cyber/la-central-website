# La Central — Homepage V5

V5 keeps the V4 cinematic homepage and adds a secure server-side Planning Center Calendar integration.

## Railway variables required
- `PLANNING_CENTER_APP_ID`
- `PLANNING_CENTER_SECRET`

Never put either value in GitHub, HTML, CSS, or browser JavaScript.

## Deploy
Upload all files in this package to the repository root and commit to `main`. Railway should detect `package.json` and run `npm start` automatically. The server listens on Railway's `PORT` variable.

## Test after deployment
- Open `/api/planning-center/status` — it should return `{"connected":true,...}`.
- Open `/api/events` — it should return an `events` array.
- The homepage Events section loads those events automatically.

If `/api/events` returns an authentication error, verify the Railway variable values and redeploy.
