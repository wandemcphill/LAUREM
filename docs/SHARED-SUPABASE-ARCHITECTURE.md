# Shared Supabase architecture

BIMED and LAUREM intentionally share one Supabase project. They do not share application tables.

## Ownership boundary

BIMED retains ownership of the existing shared `recruitment_*` and legacy workforce tables. LAUREM uses a physical `laurem_` prefix for its portal tables and RPCs.

The LAUREM server client in `lib/db.ts` keeps the application's logical table names stable while translating known LAUREM table and RPC names to their prefixed physical names. This means an existing LAUREM call such as `db().from('recruitment_applications')` reaches `laurem_recruitment_applications`, not BIMED's table.

Unknown table names and Supabase operations are passed through unchanged. LAUREM therefore cannot silently take over BIMED-only tables through the LAUREM name map.

## Data ownership

LAUREM is a brand-new portal. Its production recruitment namespace starts empty.

Existing applicants, invites, interviews, second interviews, contract signatures and other recruitment records in the shared `recruitment_*` namespace belong to BIMED's existing portal. They are not LAUREM records and must not be copied into LAUREM.

The corrective cutover migration removes any records previously copied into the LAUREM namespace and leaves the shared source tables untouched.

## Migration rule

Never rename, drop, truncate, or repurpose the existing shared BIMED tables to satisfy LAUREM migrations.

LAUREM migrations create and evolve only the `laurem_*` physical namespace and LAUREM-owned storage. New LAUREM candidate activity should create records only in that namespace.

The historical isolation migration contains legacy bootstrap-copy SQL because it was the migration used during the original shared-schema cutover. It must be treated as a historical migration and must not be repurposed as a data-import mechanism. The subsequent empty-cutover migration and baseline guard enforce the current launch policy: LAUREM starts with zero application/recruitment/workforce rows.

## Production baseline

After correction, production contains:

- LAUREM invites: 0
- LAUREM applications: 0
- LAUREM interviews: 0
- LAUREM second interviews: 0
- LAUREM archived legacy contract signatures: 0

The existing BIMED/shared counts remain unchanged: 59 invites, 15 applications, 4 interviews, 9 second interviews and 6 contract signatures.

The executable baseline guard migration fails the migration sequence if any LAUREM-owned rows exist at first launch. It performs no writes against BIMED/shared recruitment tables.

## Deployment sequence

1. Apply the LAUREM schema/isolation migrations.
2. Apply the empty-cutover cleanup migration.
3. Apply the LAUREM empty-baseline guard and require it to succeed.
4. Deploy the LAUREM application containing the `lib/db.ts` routing layer.
5. Run the authenticated LAUREM system health check.
6. Confirm new LAUREM application writes are landing in `laurem_*` tables.
7. Keep BIMED on its existing shared tables. No BIMED migration is required for the LAUREM cut-over.

This architecture intentionally favours additive isolation over a risky in-place rename or schema replacement.
