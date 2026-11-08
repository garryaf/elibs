# eLIS Web

Next.js frontend for the Enterprise Laboratory Information System (eLIS). It
provides the authenticated operational dashboard and the public result portal.

## Prerequisites

- Node.js 20+
- The eLIS API running at `http://localhost:3001`, or another configured API
  endpoint
- Dependencies installed from the repository root with `npm ci`

For the supported full-stack local environment, run `make setup` and
`make dev-up` from the repository root. See [the root README](../../README.md).

## Configuration

The browser client uses relative `/api/*` requests by default. During local
development, `next.config.ts` proxies them to `http://localhost:3001` unless
`API_URL` is set.

| Variable | Purpose |
| --- | --- |
| `API_URL` | Server-side proxy target; defaults to `http://localhost:3001` |
| `NEXT_PUBLIC_API_URL` | Optional browser-side API base URL override |

When using Docker Compose, the web container is configured to reach the API
over the internal Docker network. Avoid putting secrets in `NEXT_PUBLIC_*`
variables because they are included in browser bundles.

## Development

From `apps/web`:

```bash
npm run dev
```

Open `http://localhost:3000` and sign in with an account from
[TEST-CREDENTIALS.md](../../TEST-CREDENTIALS.md). Route conventions are
documented in [ROUTING.md](ROUTING.md).

## Quality checks

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

## Production

Create an optimized build with `npm run build` and serve it with
`npm run start`. In the standard deployment, Nginx proxies `/api/` and
`/socket.io/` traffic to the NestJS service. The production compose profile and
operational setup are documented in [../../deploy/README.md](../../deploy/README.md).
