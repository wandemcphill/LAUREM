# Shared Supabase architecture

BIMED and LAUREM intentionally share one Supabase project. They do not share application tables.

## Ownership boundary

BIMED retains ownership of the existing shared `recruitment_*` and legacy workforce tables. LAUREM uses a physical `laurem_` prefix for its portal tables and RPCs.

The LAUREM server client in `lib/db.ts` keeps the application's logical table names stable while translating known LAUREM table and RPC names to their prefixed physical names. This means an existing LAUREM call such as `db().from('recruitment_applications')` reaches `laurem_recruitment_applications`, not BIMED's table.

Unknown table names and Supabase operations are passed through unchanged. LAUREM therefore cannot silently take over BIMED-only tables through the LAUREM name map.

## Migration rule

Never rename, drop, truncate, or repurpose the existing shared BIMED tables to satisfy LAUREM migrations.

The isolation migration is additive. It creates LAUREM-owned tables, creates the required private storage bucket, and copies the legacy recruitment records into the isolated LAUREM namespace. The source rows remain untouched so BIMED can continue operating without a schema cut-over.

The copied historical application payload is retained inside `application_data.legacy_shared_application` for auditability where the source schema cannot be mapped one-to-one.

## Data currently preserved

The production migration was verified after execution with matching source and destination counts for 59 invites, 15 applications, 4 interviews, 9 second interviews and 6 legacy contract signatures.

## Deployment sequence

1. Apply the shared isolation migration.
2. Deploy the LAUREM application containing the `lib/db.ts` routing layer.
3. Run the authenticated LAUREM system health check.
4. Confirm new LAUREM application writes are landing in `laurem_*` tables.
5. Keep BIMED on its existing shared tables. No BIMED migration is required for this LAUREM cut-over.

This architecture intentionally favours additive isolation over a risky in-place rename or schema replacement.
