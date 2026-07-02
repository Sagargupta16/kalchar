# Kalchar docs

Engineering documentation for [kalchar.co.in](https://kalchar.co.in/) -- the portfolio + light storefront for folk artist Megha Seth. Start with [ARCHITECTURE.md](ARCHITECTURE.md) for the system picture, then drop into a topic.

| Doc | What it covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | The system: hybrid Next.js app, the layers, the data seam, rendering model, request lifecycles. The entry point. |
| [DATABASE.md](DATABASE.md) | Neon Postgres + Drizzle. Schema (artworks / workshops / events / settings / categories / order_presets / maintainers), the data seam, row mapping, writes, migrations + seed. |
| [AUTH.md](AUTH.md) | Auth.js v5 + Google. The two gates (proxy + signIn callback), sign-in flow, the dynamic maintainer roster + lockout guard. |
| [IMAGES.md](IMAGES.md) | Cloudflare R2 + the sharp variant pipeline, the `<picture>` serving path, upload + delete + bulk migration. |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Vercel (`main` -> prod, `dev` -> preview), branch + deploy flow, CI, the env matrix, GoDaddy DNS, releases. |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Local setup, the scripts reference, dev notes, and the conventions a contributor follows. |
| [ROADMAP.md](ROADMAP.md) | Prioritized feature roadmap from a multi-agent deep-dive: themes, phased solo-dev sequence, quick wins, big bets, RICE-scored idea pool. A decision aid, not a commitment. |

## Conventions in these docs

- Mermaid diagrams (dark theme) render natively on GitHub. Each begins with a theme init directive.
- Code locations are cited as `file.ts:42`; file links are relative from `docs/`.
- These are internal engineering notes: technical depth over polish. The double hyphen `--` stands in for a dash (the em-dash glyph is banned repo-wide, including here).
