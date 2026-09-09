# LAUREM Portal production readiness

## Purpose

LAUREM Portal is a private recruitment-to-workforce system. A green CI build is necessary but not sufficient for production readiness because the application depends on a specific Supabase schema, private document storage and server-side credentials.

## Release gates

1. **Application build**
   - `npm install`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`

2. **Server configuration**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_SESSION_SECRET` with at least 32 characters
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`

3. **Database schema**

   The production database must expose the portal tables checked by `lib/laurem-release-health.ts`. The health endpoint is intentionally opinionated: a missing expected table makes the system not ready instead of silently treating the deployment as healthy.

4. **Private storage**

   The `laurem-private-documents` bucket must exist and remain private. Recruitment and staff document APIs must continue to issue scoped, short-lived signed access rather than expose storage paths directly.

5. **Notification delivery**

   Transactional email delivery must use the shared notification ledger and idempotency semantics. Credentials, HTML bodies and full provider payloads must not be persisted in the delivery ledger.

6. **Migration verification**

   Repository migrations must be executed against the actual LAUREM Supabase project. The migration files in Git are source-of-truth for the application, but they are not evidence that production has received them.

## Operational check

Authenticated administrators can open `/admin/system/health` or call `/api/admin/system/health` to verify server configuration, database response, expected schema and private storage presence. The endpoint never returns secrets or candidate records.

A `503` response is intentional when any required production dependency is missing.

## Current migration drift warning

The connected Supabase project inspected during the September 2026 release audit contains the older `recruitment_*` workforce schema and does not yet match the current repository architecture used by the LAUREM Portal. Do not mark a production release complete until the target LAUREM project is positively identified and the current repository migrations have been applied and verified there.

## Safety rule

Never “fix” schema drift by dropping production tables or rewriting the live database to resemble the repository. Existing candidate, recruitment and workforce data must be preserved. Reconciliation requires an explicit compatibility or forward-migration strategy with backups and verification.
