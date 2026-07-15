# Operations

Runbook for database changes, recovery, stored enquiry data, and public availability. Provider dashboards and retention policies can change, so verify the current Neon, Cloudflare, and Vercel settings before relying on them.

## Schema changes

1. Create a Neon branch or provider snapshot immediately before a production migration.
2. Edit `lib/db/schema.ts`, then run `pnpm db:generate`.
3. Review the generated SQL in `drizzle/`. Never commit an unexplained destructive statement.
4. Apply the migration to a preview database with `pnpm db:migrate`.
5. Run the full verification suite against preview data.
6. Apply the same migration to production before deploying code that depends on it.

The application must remain compatible with the previous schema until the production migration has completed. Migration `0002_slow_sprite.sql` is additive, so current code remains deployable before it is applied.

Drizzle does not generate safe down migrations automatically. For a failed additive migration, fix forward when practical. For destructive data loss or widespread corruption, stop writes, roll the application back, and restore the pre-migration Neon branch.

## Database backup and restore

- Confirm Neon backup retention and point-in-time recovery in the provider dashboard each month.
- Create a named pre-migration branch for every production schema change.
- Keep a logical export before destructive maintenance. Use `pg_dump` and `pg_restore` with the approved production connection, never a credential committed to this repo.
- Test a restore into an isolated Neon branch at least quarterly. A backup is not verified until the restored app can read its catalog and admin lists.
- Record the backup timestamp, migration id, restore branch, and verification result in the release notes or incident record.

## Image recovery

Seeded artwork masters in `public/artworks/` can regenerate their R2 variants with `pnpm db:images`. Admin-uploaded replacements and event/profile photos do not have a complete repository backup. Keep the original source photos in an access-controlled external archive and verify that archive periodically.

The upload pipeline deletes attempted keys after a partial failure. Replacements upload to a versioned key, switch the database row, then remove the old key. If final cleanup fails, the public row remains valid and the old object becomes a safe orphan that can be removed during maintenance.

## Lead retention

Custom-order leads contain a name and free-text brief, which can include personal information. Current behavior is manual deletion from `/admin/leads`; no automatic retention period is enabled because the owner has not approved one.

- Restrict lead access to maintainers.
- Delete a lead promptly when the person asks for removal.
- Review closed leads monthly and remove records no longer needed for follow-up.
- Do not export leads to another service without documenting its access and retention rules.
- Agree an explicit retention period with the owner before adding automated deletion.

The public form uses a honeypot and a bounded per-client, per-instance rate limit. This reduces naive abuse but is not a durable distributed control. Turnstile or a shared rate-limit store remains deferred until credentials and an owner-approved integration are available.

## Health checks

`.github/workflows/health.yml` runs daily and can be triggered manually. It checks:

- the production homepage returns HTML with the brand marker;
- `sitemap.xml` returns XML;
- `catalog.csv` returns a CSV feed with the image column;
- the public logo returns JPEG content.

Run the same check locally against another deployment:

```sh
HEALTHCHECK_BASE_URL=https://preview.example pnpm health
```

An endpoint failure should block a release until its cause is understood. The health workflow does not test authenticated admin actions, Neon writes, R2 uploads, OAuth, WhatsApp, or provider-level backup recovery.

## Incident order

1. Confirm impact from a clean browser and the relevant provider status pages.
2. Stop risky writes or deployments.
3. Preserve logs and identify the first failing release or migration.
4. Roll back the Vercel deployment when the failure is application-only.
5. Restore from the pre-migration Neon branch only when data integrity requires it.
6. Verify the homepage, catalog feed, representative artwork page, admin login, and one non-destructive admin read.
7. Document cause, recovery, and a preventive test or monitor.
