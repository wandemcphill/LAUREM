# LAUREM production release health

## Runtime health endpoint

The production service exposes a lightweight database-backed probe at:

`GET /api/health`

The endpoint returns:

- `200` and `ok: true` when the application can reach the LAUREM recruitment database.
- `503` and `ok: false` when the database probe fails.

The public response intentionally contains no database error message, secret, environment variable value, or internal schema inventory.

## Render health-check configuration

For the Render web service `laurem-blueprint`, configure the service Health Check Path as:

`/api/health`

The current Render integration can inspect the setting but cannot mutate that service setting, so this remains a Dashboard configuration step.

## Administrative dependency health

The authenticated admin endpoint remains:

`GET /api/admin/system/health`

It performs the broader release-readiness check covering required environment variables, the LAUREM-owned schema contract, database reachability, and the private document storage bucket.

## Release rule

A release is not complete until:

1. CI passes dependency audit, typecheck, tests, production build, and health smoke test.
2. Render deploy reaches `live`.
3. The public health endpoint returns `200`.
4. The authenticated admin system health endpoint reports the expected production dependencies.
